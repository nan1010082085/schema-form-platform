/**
 * Editor Agent node.
 *
 * Uses DeepSeek LLM to generate Widget Schema JSON from natural language.
 * System prompt dynamically built from @schema-form/shared-ai metadata.
 *
 * Tool execution is handled by ToolNode in the graph — this node only
 * invokes the LLM and returns its response.
 */

import { getLLM } from '../services/llmCache.js'
import { HumanMessage, SystemMessage, AIMessage, AIMessageChunk } from '@langchain/core/messages'
import { buildEditorSystemPrompt } from '@schema-form/shared-ai/promptBuilder'
import { getMetadata } from '../tools/toolHandlers.js'
import { editorTools } from '../tools/editorTools.js'
import { collaborationTools } from '../tools/collaborationTools.js'
// truncateMessages removed — agent nodes now use state.messages directly
import { callLLMWithFallback } from './agentErrorHandler.js'
import type { AgentStateAnnotation } from './state.js'

// ────────────────────────────────────────────
// System prompt (lazy, cached)
// ────────────────────────────────────────────

let editorSystemPrompt: string | null = null

async function getEditorSystemPrompt(): Promise<string> {
  if (!editorSystemPrompt) {
    editorSystemPrompt = buildEditorSystemPrompt(getMetadata())
  }
  return editorSystemPrompt
}

// ────────────────────────────────────────────
// Context message builder
// ────────────────────────────────────────────

function buildContextMessage(state: typeof AgentStateAnnotation.State): string {
  const lastHumanMessage = [...state.messages]
    .reverse()
    .find((m) => m.constructor.name === 'HumanMessage')

  if (!lastHumanMessage) {
    throw new Error('No user message found in state.')
  }

  let prompt = typeof lastHumanMessage.content === 'string'
    ? lastHumanMessage.content
    : JSON.stringify(lastHumanMessage.content)

  // Inject current schema summary (not full JSON — use get_schema_detail tool for full content)
  if (state.context.currentSchema && state.context.currentSchema.length > 0) {
    const widgetTypes = state.context.currentSchema.map(w => w.type).join(', ')
    const widgetCount = state.context.currentSchema.length
    prompt += `\n\n--- 当前 Schema 概要 ---\n共 ${widgetCount} 个组件：${widgetTypes}\n使用 get_schema_detail 工具查看完整内容。`
  }

  // Inject conversation history summary
  if (state.interaction.historySummary) {
    prompt += `\n\n--- 前文摘要 ---\n${state.interaction.historySummary}`
  }

  // Inject user preferences
  if (state.interaction.preferences && Object.keys(state.interaction.preferences).length > 0) {
    const prefs = Object.entries(state.interaction.preferences)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n')
    prompt += `\n\n--- 用户偏好 ---\n${prefs}`
  }

  // Multi-turn hint with iteration guidance
  if (state.context.turnCount > 1) {
    prompt += `\n\n这是第 ${state.context.turnCount} 轮对话，请基于之前的对话上下文理解和修改。`
    if (state.context.currentSchema && state.context.currentSchema.length > 0) {
      prompt += `\n\n【重要】当前已有 Schema，用户可能要求修改。请使用 update_schema 工具提交修改结果，而不是 validate_schema。`
      prompt += `\n修改时请保持未变更部分不变，只修改用户要求变更的部分。在 description 字段中简要说明本次修改内容。`
    }
  }

  // Inject collaboration context from the requesting agent
  const currentStep = state.task.chain[state.task.currentStepIndex]
  if (currentStep?.context && Object.keys(currentStep.context).length > 0) {
    prompt += `\n\n--- 协作上下文（来自其他专家的信息）---\n`
    prompt += JSON.stringify(currentStep.context, null, 2)
  }

  return prompt
}

// ────────────────────────────────────────────
// Editor Agent Node
// ────────────────────────────────────────────

/**
 * Editor agent node — invokes LLM with editor system prompt.
 *
 * The LLM may return tool_calls in its response. LangGraph's
 * conditional edge routes to ToolNode when tool_calls are present,
 * then loops back here with tool results.
 */
export async function editorAgentNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  console.log(`[editorAgent] 开始执行, messages=${state.messages.length}, turnCount=${state.context.turnCount}`)

  const systemPrompt = await getEditorSystemPrompt()
  const userContent = buildContextMessage(state)

  const model = getLLM({ temperature: 0.7, maxTokens: 8192 }).bindTools([...editorTools, ...collaborationTools])

  // 直接使用 state.messages + system prompt，不重建消息列表
  // 避免 truncateMessages 截断 ToolMessage 导致 API 400 错误
  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages,
    new HumanMessage(userContent),
  ]

  return callLLMWithFallback('editorAgent', async () => {
    const stream = await model.stream(messages)
    let final: AIMessageChunk | null = null
    for await (const chunk of stream) {
      final = final ? final.concat(chunk) : chunk
    }
    if (!final) throw new Error('LLM 返回空流')
    const response = final as unknown as AIMessage
    const hasToolCalls = response.tool_calls && response.tool_calls.length > 0
    console.log(`[editorAgent] LLM 调用完成, hasToolCalls=${hasToolCalls}, contentLength=${typeof response.content === 'string' ? response.content.length : 0}`)
    return { messages: [response] }
  })
}
