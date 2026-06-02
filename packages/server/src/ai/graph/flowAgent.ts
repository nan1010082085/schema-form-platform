/**
 * Flow Agent node.
 *
 * Calls DeepSeek to generate FlowGraph JSON (nodes + edges) from natural language.
 * System prompt 从 @schema-form/shared-ai 动态构建，Flow 节点扩展自动覆盖。
 */

import OpenAI from 'openai'
import type { AIConversationState } from './state.js'
import { buildFlowSystemPrompt } from '@schema-form/shared-ai/promptBuilder'
import { FLOW_TOOLS, executeFlowTool, validateFlowGraph } from '../tools/flowTools.js'
import {
  getClient,
  buildMessages,
  parseStructuredOutput,
  createThinkingState,
  processThinkingDelta,
  withRetry,
  executeToolWithTimeout,
  MAX_TOOL_ROUNDS,
  type StreamEvent,
  type ToolCallAccumulator,
} from './agentBase.js'

// 动态加载 metadata 并构建 prompt
let flowSystemPrompt: string | null = null

async function loadMetadata() {
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const pkgPath = require.resolve('@schema-form/shared-ai/package.json')
  const jsonPath = join(dirname(pkgPath), 'metadata.json')
  return JSON.parse(readFileSync(jsonPath, 'utf-8'))
}

async function getFlowSystemPrompt(): Promise<string> {
  if (!flowSystemPrompt) {
    const metadata = await loadMetadata()
    flowSystemPrompt = buildFlowSystemPrompt(metadata)
  }
  return flowSystemPrompt
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function buildUserMessage(state: AIConversationState): string {
  const lastUserMessage = [...state.messages]
    .reverse()
    .find((m) => m.role === 'user')

  if (!lastUserMessage) {
    throw new Error('No user message found in state.')
  }

  let prompt = lastUserMessage.content

  if (state.context.currentFlow && state.context.currentFlow.nodes.length > 0) {
    prompt += '\n\n--- 当前已有流程（供参考和修改）---\n```json\n'
    prompt += JSON.stringify(state.context.currentFlow, null, 2)
    prompt += '\n```'
  }

  if (state.context.turnCount > 1) {
    prompt += `\n\n这是第 ${state.context.turnCount} 轮对话，请基于之前的对话上下文理解和修改。`
  }

  return prompt
}

// ────────────────────────────────────────────
// Flow JSON parser (from structured output)
// ────────────────────────────────────────────

function parseFlowFromOutput(schemaRaw: string): { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } {
  if (!schemaRaw) return { nodes: [], edges: [] }

  const jsonMatch = schemaRaw.match(/```(?:json)?\s*([\s\S]*?)```/) || schemaRaw.match(/(\{[\s\S]*\})/)
  if (!jsonMatch) return { nodes: [], edges: [] }

  try {
    const parsed = JSON.parse(jsonMatch[1].trim()) as Record<string, unknown>
    if (parsed.type === 'flow_update' && parsed.flow && typeof parsed.flow === 'object') {
      const flowObj = parsed.flow as Record<string, unknown>
      return {
        nodes: Array.isArray(flowObj.nodes) ? flowObj.nodes as Record<string, unknown>[] : [],
        edges: Array.isArray(flowObj.edges) ? flowObj.edges as Record<string, unknown>[] : [],
      }
    }
  } catch {
    // JSON parse failed
  }
  return { nodes: [], edges: [] }
}

// ────────────────────────────────────────────
// Streaming Flow Agent
// ────────────────────────────────────────────

export async function* streamFlowAgent(
  state: AIConversationState,
): AsyncGenerator<StreamEvent> {
  const openai = getClient()
  const systemPrompt = await getFlowSystemPrompt()
  const messages = buildMessages(state, systemPrompt, buildUserMessage)
  let fullContent = ''
  let toolRound = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const toolCallMap = new Map<number, ToolCallAccumulator>()
    const thinkState = createThinkingState()
    let contentBeforeTools = ''

    const stream = await withRetry(() =>
      openai.chat.completions.create({
        model: 'deepseek-chat',
        messages,
        tools: FLOW_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 8192,
        stream: true,
      }),
    )

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta
      if (!delta) continue

      // Handle tool calls
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index
          if (!toolCallMap.has(idx)) {
            toolCallMap.set(idx, {
              id: tc.id ?? '',
              name: tc.function?.name ?? '',
              argumentsJson: tc.function?.arguments ?? '',
            })
          } else {
            const existing = toolCallMap.get(idx)!
            if (tc.id) existing.id = tc.id
            if (tc.function?.name) existing.name = tc.function.name
            if (tc.function?.arguments) existing.argumentsJson += tc.function.arguments
          }
        }
        continue
      }

      // Handle content (thinking streaming)
      const content = delta.content ?? ''
      if (!content) continue

      fullContent += content
      contentBeforeTools += content

      const thinkEvents = processThinkingDelta(content, thinkState)
      for (const event of thinkEvents) {
        yield event
      }
    }

    // If no tool calls, break out
    if (toolCallMap.size === 0) {
      break
    }

    toolRound++
    if (toolRound > MAX_TOOL_ROUNDS) {
      yield { type: 'error', content: `工具调用轮次超过上限 (${MAX_TOOL_ROUNDS})，停止调用。` }
      break
    }

    // Execute tool calls
    const toolCalls = Array.from(toolCallMap.values()).map((tc) => ({
      id: tc.id,
      name: tc.name,
      arguments: (() => { try { return JSON.parse(tc.argumentsJson) } catch { return {} } })(),
    }))

    yield {
      type: 'tool_call',
      toolCalls: toolCalls.map((tc) => ({ id: tc.id, name: tc.name, arguments: tc.arguments })),
    }

    // Add assistant message with tool_calls
    const assistantToolMsg: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
      role: 'assistant',
      content: contentBeforeTools || null,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      })),
    }
    messages.push(assistantToolMsg)

    // Execute tools with timeout and add results
    const toolResults: Array<{ id: string; name: string; result: unknown }> = []

    for (const tc of toolCalls) {
      const result = await executeToolWithTimeout(
        () => executeFlowTool(tc.name, tc.arguments),
        tc.name,
      )
      toolResults.push({ id: tc.id, name: tc.name, result })

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      })
    }

    yield {
      type: 'tool_call',
      toolResults,
    }

    // Reset for next round
    fullContent = ''
    thinkState.inThink = false
    thinkState.thinkClosed = false
  }

  // Parse final output
  const parsed = parseStructuredOutput(fullContent)

  if (parsed.answer) {
    yield { type: 'text', content: parsed.answer }
  } else if (fullContent.trim()) {
    // Fallback：模型没有使用 <answer> 标签时，将去除 think 标签后的内容作为回答
    const fallback = fullContent
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim()
    if (fallback) {
      yield { type: 'text', content: fallback }
    }
  }

  if (parsed.tip) {
    yield { type: 'tip', content: parsed.tip }
  }

  const flow = parseFlowFromOutput(parsed.schemaRaw)
  if (flow.nodes.length > 0) {
    const errors = validateFlowGraph(flow)
    if (errors.length > 0) {
      yield {
        type: 'error',
        content: `Flow 校验失败：${errors.join('; ')}`,
      }
    } else {
      yield { type: 'flow', payload: flow }
    }
  }
}
