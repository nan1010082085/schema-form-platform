/**
 * Socket 事件协议定义
 *
 * AI → 宿主（Editor / Flow）的推送事件
 * 宿主 → AI 的上下文事件
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
} as const

// ---- Room 命名约定 ----

export function editorRoom(schemaId: string): string {
  return `editor:${schemaId}`
}

export function flowRoom(flowId: string): string {
  return `flow:${flowId}`
}
