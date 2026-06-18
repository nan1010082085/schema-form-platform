/**
 * 统一事件协议
 *
 * 定义 Agent → 前端的所有事件类型，确保类型安全和一致性。
 */

// ────────────────────────────────────────────
// 事件类型枚举
// ────────────────────────────────────────────

export type AgentEventType =
  // 文本流
  | 'text_delta'
  | 'thinking_delta'
  // Schema 生成
  | 'schema_start'
  | 'schema_progress'
  | 'schema_complete'
  | 'schema_diff'
  // Flow 生成
  | 'flow_start'
  | 'flow_progress'
  | 'flow_complete'
  | 'flow_diff'
  // 工具调用
  | 'tool_call_start'
  | 'tool_call_end'
  | 'tool_error'
  // Agent 协作
  | 'agent_switch'
  | 'agent_collaboration'
  // 任务链
  | 'chain_start'
  | 'chain_step'
  | 'chain_complete'
  // 人工介入
  | 'interrupt'
  | 'resume'
  // 状态
  | 'done'
  | 'error'

// ────────────────────────────────────────────
// Agent 类型
// ────────────────────────────────────────────

export type AgentType = 'router' | 'editor' | 'page' | 'flow' | 'general'

// ────────────────────────────────────────────
// 基础事件接口
// ────────────────────────────────────────────

export interface AgentEvent {
  /** 事件类型 */
  type: AgentEventType
  /** 事件来源 Agent */
  agent?: AgentType
  /** 时间戳 */
  timestamp?: number
  /** 会话 ID */
  conversationId?: string
  /** 线程 ID */
  threadId?: string
}

// ────────────────────────────────────────────
// 文本流事件
// ────────────────────────────────────────────

export interface TextDeltaEvent extends AgentEvent {
  type: 'text_delta'
  content: string
}

export interface ThinkingDeltaEvent extends AgentEvent {
  type: 'thinking_delta'
  content: string
}

// ────────────────────────────────────────────
// Schema 生成事件
// ────────────────────────────────────────────

export type SchemaBuildStep = 'layout' | 'components' | 'validation' | 'styling'

export interface SchemaStartEvent extends AgentEvent {
  type: 'schema_start'
  description?: string
}

export interface SchemaProgressEvent extends AgentEvent {
  type: 'schema_progress'
  step: SchemaBuildStep
  description?: string
  schema?: unknown[]
}

export interface SchemaCompleteEvent extends AgentEvent {
  type: 'schema_complete'
  schema: unknown[]
  description?: string
}

export interface SchemaDiffEvent extends AgentEvent {
  type: 'schema_diff'
  diff: unknown
  description?: string
}

// ────────────────────────────────────────────
// Flow 生成事件
// ────────────────────────────────────────────

export interface FlowStartEvent extends AgentEvent {
  type: 'flow_start'
  description?: string
}

export interface FlowProgressEvent extends AgentEvent {
  type: 'flow_progress'
  step: string
  description?: string
  flow?: unknown
}

export interface FlowCompleteEvent extends AgentEvent {
  type: 'flow_complete'
  flow: unknown
  description?: string
}

export interface FlowDiffEvent extends AgentEvent {
  type: 'flow_diff'
  diff: unknown
  description?: string
}

// ────────────────────────────────────────────
// 工具调用事件
// ────────────────────────────────────────────

export interface ToolInfo {
  id?: string
  name: string
  arguments?: Record<string, unknown>
  result?: unknown
}

export interface ToolCallStartEvent extends AgentEvent {
  type: 'tool_call_start'
  tools: ToolInfo[]
}

export interface ToolCallEndEvent extends AgentEvent {
  type: 'tool_call_end'
  tools: ToolInfo[]
}

export interface ToolErrorEvent extends AgentEvent {
  type: 'tool_error'
  toolName?: string
  runId?: string
  content?: string
}

// ────────────────────────────────────────────
// Agent 协作事件
// ────────────────────────────────────────────

export interface AgentSwitchEvent extends AgentEvent {
  type: 'agent_switch'
  agent: AgentType
  collaboration?: boolean
  description?: string
}

export interface AgentCollaborationEvent extends AgentEvent {
  type: 'agent_collaboration'
  fromAgent: AgentType
  toAgent: AgentType
  description: string
}

// ────────────────────────────────────────────
// 任务链事件
// ────────────────────────────────────────────

export interface TaskChainStep {
  agent: AgentType
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
}

export interface ChainStartEvent extends AgentEvent {
  type: 'chain_start'
  steps: TaskChainStep[]
}

export interface ChainStepEvent extends AgentEvent {
  type: 'chain_step'
  steps: TaskChainStep[]
  currentIndex: number
}

export interface ChainCompleteEvent extends AgentEvent {
  type: 'chain_complete'
  steps: TaskChainStep[]
}

// ────────────────────────────────────────────
// 人工介入事件
// ────────────────────────────────────────────

export interface InterruptEvent extends AgentEvent {
  type: 'interrupt'
  threadId: string
  interruptType: string
  message: string
  data?: unknown
}

export interface ResumeEvent extends AgentEvent {
  type: 'resume'
  threadId: string
  confirmed: boolean
}

// ────────────────────────────────────────────
// 状态事件
// ────────────────────────────────────────────

export interface DoneEvent extends AgentEvent {
  type: 'done'
  conversationId?: string
}

export interface ErrorEvent extends AgentEvent {
  type: 'error'
  content?: string
  agent?: AgentType
}

// ────────────────────────────────────────────
// 联合类型
// ────────────────────────────────────────────

export type SSEEvent =
  | TextDeltaEvent
  | ThinkingDeltaEvent
  | SchemaStartEvent
  | SchemaProgressEvent
  | SchemaCompleteEvent
  | SchemaDiffEvent
  | FlowStartEvent
  | FlowProgressEvent
  | FlowCompleteEvent
  | FlowDiffEvent
  | ToolCallStartEvent
  | ToolCallEndEvent
  | ToolErrorEvent
  | AgentSwitchEvent
  | AgentCollaborationEvent
  | ChainStartEvent
  | ChainStepEvent
  | ChainCompleteEvent
  | InterruptEvent
  | ResumeEvent
  | DoneEvent
  | ErrorEvent

// ────────────────────────────────────────────
// 兼容旧类型（过渡期）
// ────────────────────────────────────────────

/** @deprecated 使用 AgentEventType 替代 */
export type LegacySSEEventType = string

/** @deprecated 使用 SSEEvent 替代 */
export type LegacySSEEvent = Record<string, unknown>
