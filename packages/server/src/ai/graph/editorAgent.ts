/**
 * Editor Agent node.
 *
 * Calls DeepSeek to generate Widget Schema JSON from natural language.
 * System prompt 从 @schema-form/shared-ai 动态构建，Widget 扩展自动覆盖。
 */

import OpenAI from 'openai'
import type { AIConversationState } from './state.js'
import { buildEditorSystemPrompt } from '@schema-form/shared-ai/promptBuilder'
import { EDITOR_TOOLS, executeEditorTool, getWidgetCatalogueFromMetadata } from '../tools/editorTools.js'
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
let editorSystemPrompt: string | null = null

async function loadMetadata() {
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const pkgPath = require.resolve('@schema-form/shared-ai/package.json')
  const jsonPath = join(dirname(pkgPath), 'metadata.json')
  return JSON.parse(readFileSync(jsonPath, 'utf-8'))
}

async function getEditorSystemPrompt(): Promise<string> {
  if (!editorSystemPrompt) {
    const metadata = await loadMetadata()
    editorSystemPrompt = buildEditorSystemPrompt(metadata)
  }
  return editorSystemPrompt
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

  if (state.context.currentSchema && state.context.currentSchema.length > 0) {
    prompt += '\n\n--- 当前已有 Schema（供参考和修改）---\n```json\n'
    prompt += JSON.stringify(state.context.currentSchema, null, 2)
    prompt += '\n```'
  }

  if (state.context.turnCount > 1) {
    prompt += `\n\n这是第 ${state.context.turnCount} 轮对话，请基于之前的对话上下文理解和修改。`
  }

  return prompt
}

// ────────────────────────────────────────────
// Schema JSON parser (from structured output)
// ────────────────────────────────────────────

function parseSchemaFromOutput(schemaRaw: string): Record<string, unknown>[] {
  if (!schemaRaw) return []

  const jsonMatch = schemaRaw.match(/```(?:json)?\s*([\s\S]*?)```/) || schemaRaw.match(/(\{[\s\S]*\})/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[1].trim()) as Record<string, unknown>
    if (parsed.type === 'schema_update' && Array.isArray(parsed.widgets)) {
      return parsed.widgets as Record<string, unknown>[]
    }
  } catch {
    // JSON parse failed
  }
  return []
}

// ────────────────────────────────────────────
// Streaming Editor Agent
// ────────────────────────────────────────────

export async function* streamEditorAgent(
  state: AIConversationState,
): AsyncGenerator<StreamEvent> {
  const openai = getClient()
  const systemPrompt = await getEditorSystemPrompt()
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
        tools: EDITOR_TOOLS,
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

    // If no tool calls, break out of the loop
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

    // Add assistant message with tool_calls to history
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

    // Execute each tool with timeout and add results
    const toolResults: Array<{ id: string; name: string; result: unknown }> = []

    for (const tc of toolCalls) {
      const result = await executeToolWithTimeout(
        () => executeEditorTool(tc.name, tc.arguments),
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

  // Parse the final structured output
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

  const widgets = parseSchemaFromOutput(parsed.schemaRaw)
  if (widgets.length > 0) {
    // 校验：从 metadata 获取有效类型集合
    const meta = await getWidgetCatalogueFromMetadata()
    const validTypes = new Set(meta.map(w => w.type))
    const containerTypes = new Set(meta.filter(w => w.canHaveChildren).map(w => w.type))
    const errors: Array<{ path: string; message: string }> = []

    function walk(nodes: Record<string, unknown>[], prefix: string, depth: number): void {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const path = prefix ? `${prefix}[${i}]` : `[${i}]`
        const type = node.type as string | undefined
        if (!type) { errors.push({ path: `${path}.type`, message: '缺少 type' }); continue }
        if (!validTypes.has(type)) { errors.push({ path: `${path}.type`, message: `无效类型 "${type}"` }); continue }
        if (!node.id) errors.push({ path: `${path}.id`, message: '缺少 id' })
        if (containerTypes.has(type)) {
          if (!Array.isArray(node.children)) errors.push({ path: `${path}.children`, message: `容器 "${type}" 需要 children` })
          else walk(node.children as Record<string, unknown>[], path, depth + 1)
        } else if (depth === 0) {
          errors.push({ path, message: `基础组件 "${type}" 必须嵌套在容器内` })
        }
      }
    }
    walk(widgets, '', 0)

    const validation = { valid: errors.length === 0, errors }
    if (!validation.valid) {
      yield {
        type: 'error',
        content: `Schema 校验失败：${validation.errors.map((e) => `${e.path}: ${e.message}`).join('; ')}`,
      }
    } else {
      yield { type: 'schema', payload: widgets }
    }
  }
}
