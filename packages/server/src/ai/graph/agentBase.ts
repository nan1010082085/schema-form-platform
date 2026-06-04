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
// API Key validation (startup check)
// ────────────────────────────────────────────

/**
 * Validate that the DEEPSEEK_API_KEY environment variable is set and
 * has a reasonable format. Call this at module initialization or server
 * startup to fail fast rather than discovering the missing key at request time.
 *
 * Returns the key if valid. Throws with a descriptive error otherwise.
 */
export function validateApiKey(): string {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error(
      'DEEPSEEK_API_KEY environment variable is required. '
      + 'Set it in your .env file or export it before starting the server.',
    )
  }
  if (apiKey.length < 10) {
    throw new Error(
      'DEEPSEEK_API_KEY appears invalid (too short). '
      + 'Check that the key is complete and correctly set.',
    )
  }
  return apiKey
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

const MAX_HISTORY_TURNS = 5

/**
 * Truncate conversation history by conversation turns, preserving
 * complete user-assistant pairs. A "turn" is a user message followed
 * by the subsequent assistant response.
 *
 * Keeps the most recent N turns to maintain coherent multi-turn context.
 * The last message (current user message) is always excluded from history.
 *
 * Used by editor/flow agent nodes to keep the LLM context window manageable.
 */
export function truncateMessages<T extends { constructor: { name: string } }>(
  messages: readonly T[],
  maxTurns = MAX_HISTORY_TURNS,
): T[] {
  const historyMessages = messages.slice(0, -1)

  // Scan backwards to find turn boundaries.
  // A turn starts with a HumanMessage and includes all subsequent messages
  // up to (but not including) the next HumanMessage.
  const turnStarts: number[] = []
  for (let i = historyMessages.length - 1; i >= 0; i--) {
    if (historyMessages[i].constructor.name === 'HumanMessage') {
      turnStarts.unshift(i)
    }
  }

  // Keep the last N complete turns
  if (turnStarts.length > maxTurns) {
    const cutoffIndex = turnStarts[turnStarts.length - maxTurns]
    return historyMessages.slice(cutoffIndex)
  }

  return historyMessages
}

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

  // Turn-based truncation for buildMessages: keep last N user+assistant pairs
  const MAX_BUILDMessages_TURNS = 5
  const turnStarts: number[] = []
  for (let i = historyMessages.length - 1; i >= 0; i--) {
    if (historyMessages[i].role === 'user') {
      turnStarts.unshift(i)
    }
  }
  const truncatedHistory = turnStarts.length > MAX_BUILDMessages_TURNS
    ? historyMessages.slice(turnStarts[turnStarts.length - MAX_BUILDMessages_TURNS])
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
// Agent metrics
// ────────────────────────────────────────────

type AgentName = 'thinker' | 'editor' | 'flow' | 'page' | 'general' | 'summarizer' | 'router'
type Operation = 'invoke' | 'tool_call' | 'think' | 'stream'

/**
 * Execute a function with performance metrics recording.
 *
 * Records duration, success/failure, and optional token usage
 * to the AgentMetric collection.
 */
export async function executeWithMetrics<T>(
  agentName: AgentName,
  operation: Operation,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start

    // Extract token usage from LLM response if present
    const tokenUsage = extractTokenUsage(result)

    const { AgentMetricModel } = await import('../models/monitor.js')
    await AgentMetricModel.create({
      _id: (await import('uuid')).v4(),
      agentName,
      operation,
      duration,
      success: true,
      tokenUsage,
      metadata,
    })

    return result
  } catch (err) {
    const duration = Date.now() - start
    const error = err instanceof Error ? err.message : String(err)

    const { AgentMetricModel } = await import('../models/monitor.js')
    await AgentMetricModel.create({
      _id: (await import('uuid')).v4(),
      agentName,
      operation,
      duration,
      success: false,
      error,
      metadata,
    })

    throw err
  }
}

/**
 * Wrap an agent node function with metrics recording.
 *
 * Returns a new function with the same signature that records
 * execution metrics on every invocation.
 */
export function withAgentMetrics<TState, TResult>(
  agentName: AgentName,
  operation: Operation,
  nodeFn: (state: TState) => Promise<TResult>,
): (state: TState) => Promise<TResult> {
  return async (state: TState): Promise<TResult> => {
    return executeWithMetrics(agentName, operation, () => nodeFn(state))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTokenUsage(result: any): { prompt?: number; completion?: number; total?: number } | undefined {
  if (!result || typeof result !== 'object') return undefined
  const usage = result.usage
  if (!usage || typeof usage !== 'object') return undefined
  return {
    prompt: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : undefined,
    completion: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : undefined,
    total: typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined,
  }
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
