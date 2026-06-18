/**
 * @schema-form/socket — Socket.IO 客户端封装
 *
 * 提供实时通信能力，支持编辑器与 AI 应用之间的协作。
 * 使用 socket.io-client 连接服务端 Socket.IO。
 */

import { io, Socket } from 'socket.io-client'

// ---- 类型定义 ----

export interface FlowNotificationEvent {
  id: string
  userId: string
  type: string
  title: string
  content?: string
  relatedId?: string
  relatedType?: string
  isRead: boolean
  createdAt: string
}

export interface AiApplyEvent {
  type: 'schema' | 'flow'
  payload: unknown
  conversationId?: string
}

export interface AiPublishedEvent {
  type: 'schema' | 'flow'
  id: string
  publishId: string
  conversationId?: string
}

// ---- Socket 状态 ----

let socket: Socket | null = null
let connected = false

/** 获取 WebSocket URL */
function getWsUrl(): string {
  if (typeof window === 'undefined') return ''
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

// ---- 公共 API ----

/** 建立 Socket.IO 连接 */
export function connect(): void {
  if (socket) return

  const url = getWsUrl()
  if (!url) return

  socket = io(url, {
    path: '/schema-platform/ws',
    transports: ['websocket', 'polling'],
    auth: {
      token: localStorage.getItem('sfp_access_token') || '',
    },
  })

  socket.on('connect', () => {
    connected = true
    console.log('[socket] connected')
  })

  socket.on('disconnect', () => {
    connected = false
    console.log('[socket] disconnected')
  })

  socket.on('connect_error', (err) => {
    console.warn('[socket] connection error:', err.message)
  })
}

/** 断开连接 */
export function disconnect(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    connected = false
  }
}

/** 标识当前用户 */
export function identify(userId: string): void {
  if (socket && connected) {
    socket.emit('identify', { userId })
  }
}

// ---- 编辑器事件 ----

/** 监听 AI 应用事件 */
export function onAiApply(handler: (data: AiApplyEvent) => void): () => void {
  if (!socket) return () => {}
  socket.on('ai:apply', handler)
  return () => { socket?.off('ai:apply', handler) }
}

/** 监听 AI 发布事件 */
export function onAiPublished(handler: (data: AiPublishedEvent) => void): () => void {
  if (!socket) return () => {}
  socket.on('ai:published', handler)
  return () => { socket?.off('ai:published', handler) }
}

/** 发送 AI 应用事件 */
export function emitAiApply(data: AiApplyEvent): void {
  if (socket && connected) {
    socket.emit('ai:apply', data)
  }
}

/** 发送 AI 发布事件 */
export function emitAiPublished(data: AiPublishedEvent): void {
  if (socket && connected) {
    socket.emit('ai:published', data)
  }
}

// ---- 流程通知 ----

/** 监听流程通知 */
export function onFlowNotification(handler: (data: FlowNotificationEvent) => void): () => void {
  if (!socket) return () => {}
  socket.on('flow:notification', handler)
  return () => { socket?.off('flow:notification', handler) }
}

// ---- AI Chat (WebSocket 流式对话) ----

export interface ChatSendPayload {
  conversationId?: string
  message: string
  context: {
    source: string
    schemaId?: string
    flowId?: string
    nodeId?: string
    version?: string
    preferences?: Record<string, unknown>
    historySummary?: string
    currentSchema?: Record<string, unknown>[]
    currentFlow?: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }
    selectedWidget?: { id: string; type: string; field?: string; label?: string }
    editorMode?: 'edit' | 'preview'
  }
  mentions?: Array<{ id: string; type: string; name?: string; label?: string }>
}

export interface ChatEvent {
  threadId: string
  type: string
  agent?: string
  content?: string
  description?: string
  [key: string]: unknown
}

/** 发送聊天消息（启动流式响应） */
export function emitChatSend(data: ChatSendPayload): void {
  if (socket && connected) {
    socket.emit('chat:send', data)
  }
}

/** 取消当前聊天流 */
export function emitChatCancel(): void {
  if (socket && connected) {
    socket.emit('chat:cancel')
  }
}

/** 恢复 HITL 中断的对话 */
export function emitChatResume(threadId: string, confirmed: boolean): void {
  if (socket && connected) {
    socket.emit('chat:resume', { threadId, confirmed })
  }
}

/** 监听聊天流事件 */
export function onChatEvent(handler: (data: ChatEvent) => void): () => void {
  if (!socket) return () => {}
  socket.on('chat:event', handler)
  return () => { socket?.off('chat:event', handler) }
}
