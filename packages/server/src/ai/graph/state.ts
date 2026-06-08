/**
 * AI Conversation State — LangGraph Annotation definition.
 *
 * Defines the shared state passed through the agent graph using
 * LangGraph's Annotation.Root() pattern. MessagesAnnotation serves
 * as the base for message handling with proper reducer semantics.
 *
 * State is organized into 5 nested groups:
 *   - session:  identifiers and active agent
 *   - task:     task chain, step tracking, intermediate results
 *   - tools:    tool calling state
 *   - error:    error handling
 *   - interaction: clarification, preferences, history summary, collaboration
 *
 * Plus two top-level fields:
 *   - messages: from MessagesAnnotation (reducer for message combining)
 *   - context:  business context (AIContext — well-structured, not flat)
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
export type AgentSource = 'editor' | 'flow' | 'page' | 'standalone'
export type ActiveAgent = 'router' | 'editor' | 'flow' | 'page' | 'general'

/** Task chain step */
export interface TaskStep {
  agent: 'editor' | 'flow' | 'page'
  description: string
  status: 'pending' | 'running' | 'done' | 'skipped'
  result?: Record<string, unknown>
  /** Collaboration context passed from the requesting agent. */
  context?: Record<string, unknown>
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
  /** @ referenced resource content */
  mentionedResources?: Array<{ type: 'schema' | 'flow'; name: string; content: Record<string, unknown> | Record<string, unknown>[] }>
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
// Collaboration request type
// ────────────────────────────────────────────
export interface CollaborationRequest {
  targetAgent: 'editor' | 'flow' | 'page'
  description: string
  context?: Record<string, unknown>
  conversationId?: string
}

// ────────────────────────────────────────────
// LangGraph State Annotation (nested structure)
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

  // Business context (schema, flow, source info) — well-structured, stays top-level
  context: Annotation<AIContext>({
    reducer: (_, next) => next,
    default: () => ({ source: 'standalone' as AgentSource, turnCount: 0 }),
  }),

  // ── Group 1: Session ──
  session: Annotation<{
    id: string
    conversationId: string
    currentAgent: ActiveAgent
  }>({
    reducer: (_, next) => next,
    default: () => ({ id: '', conversationId: '', currentAgent: 'router' as ActiveAgent }),
  }),

  // ── Group 2: Task ──
  task: Annotation<{
    type: string
    chain: TaskStep[]
    currentStepIndex: number
    intermediateResults: Record<string, unknown>[]
    currentVersion: number
  }>({
    reducer: (_, next) => next,
    default: () => ({ type: 'general', chain: [], currentStepIndex: 0, intermediateResults: [], currentVersion: 0 }),
  }),

  // ── Group 3: Tools ──
  tools: Annotation<{
    needsTool: boolean
    results: AgentToolResult[]
    toolIterationCount: number
  }>({
    reducer: (_, next) => next,
    default: () => ({ needsTool: false, results: [], toolIterationCount: 0 }),
  }),

  // ── Group 4: Error ──
  error: Annotation<AIError | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // ── Group 5: Interaction ──
  interaction: Annotation<{
    clarificationRequest: string | null
    clarificationOptions: string[]
    preferences: Record<string, unknown>
    historySummary: string
    collaborationRequest: CollaborationRequest | null
  }>({
    reducer: (_, next) => next,
    default: () => ({
      clarificationRequest: null,
      clarificationOptions: [],
      preferences: {},
      historySummary: '',
      collaborationRequest: null,
    }),
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
