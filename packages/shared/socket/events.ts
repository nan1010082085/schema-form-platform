/**
 * Socket 事件协议定义
 *
 * AI → 宿主（Editor / Flow）的推送事件
 * 宿主 → AI 的上下文事件
 * 协作同步事件
 */

// ---- AI 推送到宿主的事件 ----

/** AI 生成了 Schema/Flow，请求宿主应用到画布 */
export interface AiApplyEvent {
  type: 'schema' | 'flow'
  payload: Record<string, unknown>[] | Record<string, unknown>
  conversationId?: string
}

/** AI 发布完成，通知宿主 */
export interface AiPublishedEvent {
  type: 'schema' | 'flow'
  id: string
  publishId?: string
  conversationId?: string
}

// ---- 宿主推送到 AI 的事件 ----

/** 宿主设置 AI 上下文 */
export interface HostContextEvent {
  source: 'editor' | 'flow' | 'standalone'
  schemaId?: string
  flowId?: string
  nodeId?: string
}

// ---- 协作同步事件 ----

/** SSE 事件转发给协作参与者 */
export interface CollabAiSyncEvent {
  conversationId: string
  userId?: string
  event: Record<string, unknown>
}

/** 消息状态更新 */
export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'received' | 'error'

export interface CollabMessageStatusEvent {
  conversationId: string
  messageIndex: number
  status: MessageStatus
  error?: string
}

/** 生成开始 */
export interface CollabGenerationStartEvent {
  conversationId: string
  userId?: string
  userMessage: string
  timestamp: Date
}

/** 生成结束 */
export interface CollabGenerationEndEvent {
  conversationId: string
  success: boolean
  timestamp: Date
}

/** 协作参与者变更 */
export interface CollabParticipantEvent {
  conversationId: string
  userId: string
  participants: string[]
}

/** 协作消息 */
export interface CollabMessageEvent {
  id: string
  userId: string
  content: string
  conversationId: string
  timestamp: Date
}

// ---- Socket 事件名常量 ----

export const SOCKET_EVENTS = {
  /** AI → 宿主：请求应用生成结果 */
  AI_APPLY: 'ai:apply',
  /** AI → 宿主：发布完成 */
  AI_PUBLISHED: 'ai:published',
  /** 宿主 → AI：设置上下文 */
  HOST_CONTEXT: 'host:context',
  /** 连接成功 */
  CONNECT: 'connect',
  /** 断开连接 */
  DISCONNECT: 'disconnect',

  // ---- 通知事件 ----
  /** 服务端 → 客户端：新通知 */
  FLOW_NOTIFICATION: 'flow:notification',

  // ---- 协作事件 ----
  /** 加入协作会话 */
  COLLAB_JOIN: 'collab:join',
  /** 离开协作会话 */
  COLLAB_LEAVE: 'collab:leave',
  /** AI SSE 事件同步 */
  COLLAB_AI_SYNC: 'collab:ai-sync',
  /** 消息状态更新 */
  COLLAB_MESSAGE_STATUS: 'collab:message-status',
  /** 生成开始 */
  COLLAB_GENERATION_START: 'collab:generation-start',
  /** 生成结束 */
  COLLAB_GENERATION_END: 'collab:generation-end',
  /** 用户加入 */
  COLLAB_USER_JOINED: 'collab:user-joined',
  /** 用户离开 */
  COLLAB_USER_LEFT: 'collab:user-left',
  /** 参与者列表 */
  COLLAB_PARTICIPANTS: 'collab:participants',
  /** 发送协作消息 */
  COLLAB_SEND_MESSAGE: 'collab:send-message',
  /** 新协作消息 */
  COLLAB_NEW_MESSAGE: 'collab:new-message',
} as const

// ---- Room 命名约定 ----

export function editorRoom(schemaId: string): string {
  return `editor:${schemaId}`
}

export function flowRoom(flowId: string): string {
  return `flow:${flowId}`
}

export function collabRoom(conversationId: string): string {
  return `collab:${conversationId}`
}
