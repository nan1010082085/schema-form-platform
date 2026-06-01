/**
 * AI Conversation State — the shared state passed through the agent graph.
 *
 * Supports Router Agent, Editor Agent, and Flow Agent with multi-turn
 * conversation, tool calling, and streaming.
 */

// ────────────────────────────────────────────
// Message types
// ────────────────────────────────────────────
export type AIMessageRole = 'user' | 'assistant' | 'system'

export interface AIMessage {
  role: AIMessageRole
  content: string
  /** Agent thinking process (shown in collapsible section). */
  thinking?: string
  /** Usage tip or optimization suggestion. */
  tip?: string
  /** Tool calls made during this turn. */
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }>
  /** Optional structured payload attached to an assistant message. */
  schema?: Record<string, unknown>[]
  flow?: Record<string, unknown>
  timestamp: Date
}

// ────────────────────────────────────────────
// Context
// ────────────────────────────────────────────
export type AgentSource = 'editor' | 'flow' | 'standalone'
export type ActiveAgent = 'router' | 'editor' | 'flow'

export interface AIContext {
  source: AgentSource
  schemaId?: string
  flowId?: string
  nodeId?: string
  /** Current Widget tree in the editor, provided by the frontend for reference. */
  currentSchema?: Record<string, unknown>[]
  /** Current flow graph, provided for flow conversations. */
  currentFlow?: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }
  /** Running count of user turns in this conversation. */
  turnCount: number
}

// ────────────────────────────────────────────
// Error state
// ────────────────────────────────────────────
export interface AIError {
  message: string
  recoverable: boolean
}

// ────────────────────────────────────────────
// Full conversation state
// ────────────────────────────────────────────
export interface AIConversationState {
  messages: AIMessage[]
  activeAgent: ActiveAgent
  context: AIContext
  error?: AIError
}
