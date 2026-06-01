/**
 * Shared agent infrastructure.
 *
 * Extracts common patterns used by editorAgent and flowAgent:
 * - OpenAI client initialization
 * - Message history building
 * - Structured output parsing (think/answer/tip/schema tags)
 * - Tool calling loop with streaming
 */

import OpenAI from 'openai'
import type { AIConversationState } from './state.js'

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
// Message history builder
// ────────────────────────────────────────────

export function buildMessages(
  state: AIConversationState,
  systemPrompt: string,
  buildUserMessage: (state: AIConversationState) => string,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ]

  const historyMessages = state.messages.slice(0, -1)
  for (const msg of historyMessages) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content })
    } else if (msg.role === 'assistant') {
      messages.push({ role: 'assistant', content: msg.content })
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
// Tool calling types
// ────────────────────────────────────────────

export interface ToolCallAccumulator {
  id: string
  name: string
  argumentsJson: string
}

export interface StreamToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface StreamToolResult {
  id: string
  name: string
  result: unknown
}

export const MAX_TOOL_ROUNDS = 5

// ────────────────────────────────────────────
// Streaming SSE event types (unified)
// ────────────────────────────────────────────

export interface StreamEvent {
  type: 'thinking' | 'text' | 'tip' | 'schema' | 'flow' | 'tool_call' | 'error'
  content?: string
  payload?: unknown
  toolCalls?: StreamToolCall[]
  toolResults?: StreamToolResult[]
}

// ────────────────────────────────────────────
// Thinking stream handler
// ────────────────────────────────────────────

export interface ThinkingState {
  inThink: boolean
  thinkClosed: boolean
  fullContent: string
}

export function createThinkingState(): ThinkingState {
  return { inThink: false, thinkClosed: false, fullContent: '' }
}

/**
 * Process a content delta for thinking extraction.
 * Returns thinking events to yield, or null if not a thinking chunk.
 */
export function processThinkingDelta(
  content: string,
  state: ThinkingState,
): StreamEvent[] {
  const events: StreamEvent[] = []
  state.fullContent += content

  if (!state.inThink && !state.thinkClosed) {
    const thinkStart = state.fullContent.indexOf('<think>')
    if (thinkStart !== -1) {
      const afterTag = state.fullContent.slice(thinkStart + 7)
      if (afterTag.length > 0) {
        state.inThink = true
        events.push({ type: 'thinking', content: afterTag })
      }
    }
    return events
  }

  if (state.inThink && !state.thinkClosed) {
    const thinkEnd = state.fullContent.indexOf('</think>')
    if (thinkEnd !== -1) {
      const thinkContent = state.fullContent.slice(
        state.fullContent.indexOf('<think>') + 7,
        thinkEnd,
      )
      events.push({ type: 'thinking', content: thinkContent })
      state.thinkClosed = true
      state.inThink = false
    } else {
      events.push({ type: 'thinking', content })
    }
  }

  return events
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

      // Only retry on transient errors
      const status = (err as { status?: number }).status
      const isTransient = !status || [429, 500, 502, 503, 504].includes(status)
      if (!isTransient) break

      const delay = BASE_DELAY_MS * Math.pow(2, attempt)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

// ────────────────────────────────────────────
// Tool execution with timeout
// ────────────────────────────────────────────

const TOOL_TIMEOUT_MS = 30_000

/**
 * Execute a tool function with a timeout.
 * Returns a result object even on failure (never throws).
 */
export async function executeToolWithTimeout<T>(
  fn: () => Promise<T>,
  toolName: string,
  timeoutMs = TOOL_TIMEOUT_MS,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ])
    return { success: true, data: result }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Tool "${toolName}" failed: ${message}` }
  }
}
