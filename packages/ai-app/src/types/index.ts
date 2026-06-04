/**
 * AI 应用类型定义
 *
 * 对齐后端 AIConversationState 和 API 响应结构。
 */

// ---- Widget（简化引用，完整类型在 editor 包） ----

/** Widget 位置信息 */
export interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
  zIndex?: number
}

/** Widget 基础结构（对齐 editor/widgets/base/types.ts） */
export interface Widget {
  id: string
  type: string
  field?: string
  label?: string
  props?: Record<string, unknown>
  position?: WidgetPosition
  children?: Widget[]
  events?: unknown[]
  rules?: unknown[]
  variables?: unknown[]
}

// ---- FlowGraph（对齐后端 FlowGraph 结构） ----

export interface FlowNodeData {
  bpmnType: string
  label?: string
  [key: string]: unknown
}

export interface FlowNode {
  id: string
  data: FlowNodeData
  position?: { x: number; y: number }
  width?: number
  height?: number
}

export interface FlowEdgeData {
  conditionExpression?: string
  isDefault?: boolean
  [key: string]: unknown
}

export interface FlowEdge {
  id: string
  source: { cell: string }
  target: { cell: string }
  data?: FlowEdgeData
}

export interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

// ---- 对话消息 ----

export interface ToolCallInfo {
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  agent?: 'editor' | 'flow' | 'general'
  thinking?: string
  thinkingExpanded?: boolean
  tip?: string
  toolCalls?: ToolCallInfo[]
  toolCallsExpanded?: boolean
  schema?: Widget[]
  flow?: FlowGraph
  timestamp: Date
}

// ---- 上下文 ----

export interface ChatContext {
  source: 'editor' | 'flow' | 'standalone'
  schemaId?: string
  flowId?: string
  nodeId?: string
  version?: string
  /** 用户偏好（如布局风格、label 宽度约定） */
  preferences?: Record<string, unknown>
  /** 前文摘要（长对话时压缩早期消息） */
  historySummary?: string
}

// ---- 对话请求 ----

export interface ChatRequest {
  conversationId?: string
  message: string
  context: ChatContext
}

// ---- SSE 事件 ----

export type SSEEventType = 'text' | 'thinking' | 'tip' | 'schema' | 'flow' | 'tool_call' | 'tool_error' | 'task_chain' | 'agent_switch' | 'done' | 'error'

export interface SSEEvent {
  type: SSEEventType
  content?: string
  payload?: Widget[] | FlowGraph
  description?: string
  conversationId?: string
  /** Tool call event data */
  phase?: 'calling' | 'result'
  tools?: Array<{ id: string; name: string; arguments?: Record<string, unknown>; result?: unknown }>
  /** Task chain event data */
  steps?: TaskChainStep[]
  currentIndex?: number
  /** Agent switch event data */
  agent?: string
  /** Collaboration event data */
  collaboration?: boolean
  /** Tool error event data */
  toolName?: string
}

// ---- 任务链 ----

export interface TaskChainStep {
  agent: 'editor' | 'flow'
  description: string
  status: 'pending' | 'running' | 'done' | 'skipped'
}

// ---- 发布 ----

export interface PublishRequest {
  conversationId: string
  type: 'schema' | 'flow'
  payload: Widget[] | FlowGraph
  target?: {
    type: 'flow_node'
    flowId: string
    nodeId: string
  }
}

export interface PublishResponse {
  id: string
  publishId?: string
  boundTo?: {
    flowId: string
    nodeId: string
  }
}

// ---- 对话列表 ----

export interface Conversation {
  id: string
  title: string
  source: 'editor' | 'flow' | 'standalone'
  activeAgent: 'router' | 'editor' | 'flow' | 'general'
  version?: string
  createdAt: string
  updatedAt: string
}

// ---- Agent ----

export type AgentType = 'editor' | 'flow' | 'auto' | 'general'
