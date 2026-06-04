/**
 * Page Agent node.
 *
 * Uses DeepSeek LLM to generate business page Schema JSON (list, statistic,
 * detail pages) from natural language. System prompt dynamically built from
 * @schema-form/shared-ai metadata.
 *
 * Tool execution is handled by ToolNode in the graph — this node only
 * invokes the LLM and returns its response.
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { buildPageSystemPrompt } from '@schema-form/shared-ai/promptBuilder'
import { editorTools } from '../tools/editorTools.js'
import { collaborationTools } from '../tools/collaborationTools.js'
import { truncateMessages } from './agentBase.js'
import type { AgentStateAnnotation } from './state.js'

// ────────────────────────────────────────────
// Metadata loading (lazy, cached)
// ────────────────────────────────────────────

let pageSystemPrompt: string | null = null

async function loadMetadata(): Promise<Record<string, unknown>> {
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const pkgPath = require.resolve('@schema-form/shared-ai/package.json')
  const jsonPath = join(dirname(pkgPath), 'metadata.json')
  return JSON.parse(readFileSync(jsonPath, 'utf-8'))
}

async function getPageSystemPrompt(): Promise<string> {
  if (!pageSystemPrompt) {
    const metadata = await loadMetadata()
    pageSystemPrompt = buildPageSystemPrompt(metadata as unknown as Parameters<typeof buildPageSystemPrompt>[0])
  }
  return pageSystemPrompt
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

  // Multi-turn hint with iteration guidance
  if (state.context.turnCount > 1) {
    prompt += `\n\n这是第 ${state.context.turnCount} 轮对话，请基于之前的对话上下文理解和修改。`
    if (state.context.currentSchema && state.context.currentSchema.length > 0) {
      prompt += `\n\n【重要】当前已有 Schema，用户可能要求修改。请使用 update_schema 工具提交修改结果，而不是 validate_schema。`
      prompt += `\n修改时请保持未变更部分不变，只修改用户要求变更的部分。在 description 字段中简要说明本次修改内容。`
    }
  }

  // Inject collaboration context from the requesting agent
  const currentStep = state.taskChain[state.currentStepIndex]
  if (currentStep?.context && Object.keys(currentStep.context).length > 0) {
    prompt += `\n\n--- 协作上下文（来自其他专家的信息）---\n`
    prompt += JSON.stringify(currentStep.context, null, 2)
  }

  return prompt
}

// ────────────────────────────────────────────
// Page Agent Node
// ────────────────────────────────────────────

/**
 * Page agent node — invokes LLM with page system prompt.
 *
 * The LLM may return tool_calls in its response. LangGraph's
 * conditional edge routes to ToolNode when tool_calls are present,
 * then loops back here with tool results.
 */
export async function pageAgentNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required.')
  }

  const systemPrompt = await getPageSystemPrompt()
  const userContent = buildContextMessage(state)

  const model = new ChatOpenAI({
    model: 'deepseek-v4-pro',
    apiKey,
    configuration: { baseURL: 'https://api.deepseek.com' },
    temperature: 0.7,
    maxTokens: 8192,
    streaming: true,
  }).bindTools([...editorTools, ...collaborationTools])

  // Build message list: system prompt + conversation history (truncated) + current user message
  const truncatedHistory = truncateMessages(state.messages)

  const messages = [
    new SystemMessage(systemPrompt),
    ...truncatedHistory,
    new HumanMessage(userContent),
  ]

  const response = await model.invoke(messages)

  return { messages: [response] }
}
