/**
 * Editor Agent node.
 *
 * Uses DeepSeek LLM to generate Widget Schema JSON from natural language.
 * System prompt dynamically built from @schema-form/shared-ai metadata.
 *
 * Tool execution is handled by ToolNode in the graph — this node only
 * invokes the LLM and returns its response.
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import { buildEditorSystemPrompt } from '@schema-form/shared-ai/promptBuilder'
import { editorTools } from '../tools/editorTools.js'
import type { AgentStateAnnotation } from './state.js'

// ────────────────────────────────────────────
// Metadata loading (lazy, cached)
// ────────────────────────────────────────────

let editorSystemPrompt: string | null = null

async function loadMetadata(): Promise<Record<string, unknown>> {
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const pkgPath = require.resolve('@schema-form/shared-ai/package.json')
  const jsonPath = join(dirname(pkgPath), 'metadata.json')
  return JSON.parse(readFileSync(jsonPath, 'utf-8'))
}

async function getEditorSystemPrompt(): Promise<string> {
  if (!editorSystemPrompt) {
    const metadata = await loadMetadata()
    editorSystemPrompt = buildEditorSystemPrompt(metadata as unknown as Parameters<typeof buildEditorSystemPrompt>[0])
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

  // Inject current schema for modification requests
  if (state.context.currentSchema && state.context.currentSchema.length > 0) {
    prompt += '\n\n--- 当前已有 Schema（供参考和修改）---\n```json\n'
    prompt += JSON.stringify(state.context.currentSchema, null, 2)
    prompt += '\n```'
  }

  // Inject conversation history summary
  if (state.historySummary) {
    prompt += `\n\n--- 前文摘要 ---\n${state.historySummary}`
  }

  // Inject user preferences
  if (state.preferences && Object.keys(state.preferences).length > 0) {
    const prefs = Object.entries(state.preferences)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n')
    prompt += `\n\n--- 用户偏好 ---\n${prefs}`
  }

  // Multi-turn hint
  if (state.context.turnCount > 1) {
    prompt += `\n\n这是第 ${state.context.turnCount} 轮对话，请基于之前的对话上下文理解和修改。`
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
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required.')
  }

  const systemPrompt = await getEditorSystemPrompt()
  const userContent = buildContextMessage(state)

  const model = new ChatOpenAI({
    model: 'deepseek-chat',
    apiKey,
    configuration: { baseURL: 'https://api.deepseek.com' },
    temperature: 0.7,
    maxTokens: 8192,
    streaming: true,
    modelKwargs: { response_format: { type: 'json_object' } },
  }).bindTools(editorTools)

  // Build message list: system prompt + conversation history (truncated) + current user message
  const MAX_HISTORY = 10
  const historyMessages = state.messages.slice(0, -1)
  const truncatedHistory = historyMessages.length > MAX_HISTORY
    ? historyMessages.slice(-MAX_HISTORY)
    : historyMessages

  const messages = [
    new SystemMessage(systemPrompt),
    ...truncatedHistory,
    new HumanMessage(userContent),
  ]

  const response = await model.invoke(messages)

  return { messages: [response] }
}
