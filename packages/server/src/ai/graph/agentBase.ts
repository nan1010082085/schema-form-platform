/**
 * Shared agent infrastructure.
 *
 * Utility functions used across the AI agent system:
 * - OpenAI client singleton
 * - Model configuration per task type
 * - Message building for direct LLM calls (schemaGenerator)
 * - Structured output parsing (think/answer/tip/schema tags)
 * - Retry with exponential backoff
 * - Regex safety
 *
 * Note: LangGraph handles the main agent loop, tool execution,
 * and streaming. These utilities are retained for schemaGenerator.ts
 * and tool implementations.
 */

import OpenAI from 'openai'

// ────────────────────────────────────────────
// OpenAI client (shared singleton)
// ────────────────────────────────────────────

let client: OpenAI | null = null

export function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required.')
    }
    client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey,
    })
  }
  return client
}

// ────────────────────────────────────────────
// Model configuration per task type
// ────────────────────────────────────────────

export type TaskType = 'router' | 'generate_simple' | 'generate_complex' | 'analyze'

/**
 * Select model by task type.
 *
 * - router: intent classification, cheap and fast
 * - generate_simple: simple generation (single form, single list), V3
 * - generate_complex: complex reasoning (multi-step, linkage, nested), R1
 * - analyze: analysis/diagnosis tasks, V3
 */
export function getModelForTask(taskType: TaskType): string {
  const modelMap: Record<TaskType, string> = {
    router: 'deepseek-v4-pro',
    generate_simple: 'deepseek-v4-pro',
    generate_complex: 'deepseek-v4-pro',
    analyze: 'deepseek-v4-pro',
  }
  return modelMap[taskType] ?? 'deepseek-v4-pro'
}

/**
 * Classify task complexity from user message using heuristic rules.
 */
export function classifyTaskComplexity(message: string): TaskType {
  const complexIndicators = [
    '联动', '条件', '动态', '多步', '复杂',
    '同时', '并且', '然后', '之后',
    '审批', '流程', '表单',
    '会签', '或签', '分支',
  ]

  const matchCount = complexIndicators.filter((kw) => message.includes(kw)).length

  if (matchCount >= 2) return 'generate_complex'

  return 'generate_simple'
}

// ────────────────────────────────────────────
// Message history builder (with truncation)
// ────────────────────────────────────────────

const MAX_HISTORY_MESSAGES = 10

/**
 * Build LLM message array from conversation state.
 *
 * Used by schemaGenerator.ts for direct (non-graph) LLM calls.
 * LangGraph nodes handle message management via the graph state.
 *
 * Accepts a loose state shape since schemaGenerator constructs its own.
 */
export function buildMessages(
  state: { messages: Array<{ role: string; content: string }>; [key: string]: unknown },
  systemPrompt: string,
  buildUserMessage: (state: { messages: Array<{ role: string; content: string }>; [key: string]: unknown }) => string,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ]

  const historyMessages = state.messages.slice(0, -1)
  const truncatedHistory = historyMessages.length > MAX_HISTORY_MESSAGES
    ? historyMessages.slice(-MAX_HISTORY_MESSAGES)
    : historyMessages

  for (const msg of truncatedHistory) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content })
    } else if (msg.role === 'assistant') {
      const content = msg.content.length > 2000
        ? msg.content.slice(0, 2000) + '...(已截断)'
        : msg.content
      messages.push({ role: 'assistant', content })
    }
  }

  messages.push({ role: 'user', content: buildUserMessage(state) })

  return messages
}

// ────────────────────────────────────────────
// Structured output parser
// ────────────────────────────────────────────

export interface ParsedStructuredOutput {
  thinking: string
  answer: string
  tip: string
  schemaRaw: string
  hasStructuredTags: boolean
}

export function parseStructuredOutput(raw: string): ParsedStructuredOutput {
  const extract = (tag: string): string => {
    const re = new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`)
    const m = raw.match(re)
    return m ? m[1].trim() : ''
  }

  const thinking = extract('think')
  const answer = extract('answer')
  const tip = extract('tip')
  const schemaRaw = extract('schema')

  return {
    thinking,
    answer,
    tip,
    schemaRaw,
    hasStructuredTags: !!(thinking || answer || tip || schemaRaw),
  }
}

// ────────────────────────────────────────────
// Regex safety
// ────────────────────────────────────────────

/**
 * Escape special regex characters in a string for safe use in $regex queries.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ────────────────────────────────────────────
// Retry with exponential backoff
// ────────────────────────────────────────────

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

/**
 * Retry a function with exponential backoff for transient errors.
 * Only retries on network errors and 429/500/502/503/504 status codes.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES,
): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt === maxRetries) break

      const status = (err as { status?: number }).status
      const isTransient = !status || [429, 500, 502, 503, 504].includes(status)
      if (!isTransient) break

      const delay = BASE_DELAY_MS * Math.pow(2, attempt)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}
