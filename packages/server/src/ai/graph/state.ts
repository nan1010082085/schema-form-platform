/**
 * AI Conversation State — LangGraph Annotation definition.
 *
 * Defines the shared state passed through the agent graph using
 * LangGraph's Annotation.Root() pattern. MessagesAnnotation serves
 * as the base for message handling with proper reducer semantics.
 */

import { Annotation, MessagesAnnotation } from '@langchain/langgraph'
import type { BaseMessage } from '@langchain/core/messages'

// ────────────────────────────────────────────
// Message types (kept for backward compatibility)
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
export type ActiveAgent = 'router' | 'editor' | 'flow' | 'general'

/** 任务链步骤 */
export interface TaskStep {
  agent: 'editor' | 'flow'
  description: string
  status: 'pending' | 'running' | 'done' | 'skipped'
  result?: Record<string, unknown>
}

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
// Router and Tool types
// ────────────────────────────────────────────
export interface RouterDecision {
  target: ActiveAgent
  confidence: number
  reasoning?: string
}

export interface AgentToolResult {
  name: string
  arguments: Record<string, unknown>
  result: unknown
  error?: string
  duration?: number
}

// ────────────────────────────────────────────
// LangGraph State Annotation
// ────────────────────────────────────────────

/**
 * Full AI conversation state using LangGraph's Annotation.Root().
 *
 * MessagesAnnotation provides the `messages` field with proper
 * message combining semantics (handles BaseMessage, RemoveMessage, etc.).
 *
 * All custom fields use "replace" semantics (last write wins).
 */
export const AgentStateAnnotation = Annotation.Root({
  // Inherit messages from MessagesAnnotation (includes reducer for message combining)
  ...MessagesAnnotation.spec,

  // Session and conversation identifiers
  sessionId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  conversationId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  // Current active agent in the graph
  currentAgent: Annotation<ActiveAgent>({
    reducer: (_, next) => next,
    default: () => 'router' as ActiveAgent,
  }),

  // Business context (schema, flow, source info)
  context: Annotation<AIContext>({
    reducer: (_, next) => next,
    default: () => ({ source: 'standalone' as AgentSource, turnCount: 0 }),
  }),

  // Task type classification
  taskType: Annotation<string>({
    reducer: (_, next) => next,
    default: () => 'general',
  }),

  // Tool calling state
  needsTool: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),

  toolResults: Annotation<AgentToolResult[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // Error handling
  error: Annotation<AIError | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Clarification flow
  clarificationRequest: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  clarificationOptions: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // Task chain (Router decomposes complex requests)
  taskChain: Annotation<TaskStep[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  currentStepIndex: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  // Intermediate results from subtasks
  intermediateResults: Annotation<Record<string, unknown>[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // User preferences (layout style, conventions)
  preferences: Annotation<Record<string, unknown>>({
    reducer: (_, next) => next,
    default: () => ({}),
  }),

  // Summary of earlier conversation turns
  historySummary: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
})

// ────────────────────────────────────────────
// Type aliases
// ────────────────────────────────────────────

/** Full state type for the AI conversation graph. */
export type AIConversationState = typeof AgentStateAnnotation.State

/** State type for Editor Agent subgraph. */
export type EditorAgentState = typeof AgentStateAnnotation.State

/** Update type for partial state updates from nodes. */
export type AgentStateUpdate = typeof AgentStateAnnotation.Update
