/**
 * @schema-form/socket — Socket.IO 客户端封装
 *
 * 提供实时通信能力，支持编辑器与 AI 应用之间的协作。
 */

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
  widgets: unknown[]
  timestamp: number
}

export interface AiPublishedEvent {
  schemaId: string
  timestamp: number
}

// ---- Socket 状态 ----

let socket: WebSocket | null = null
let connected = false
const listeners = new Map<string, Set<(data: unknown) => void>>()

/** 获取 WebSocket URL */
function getWsUrl(): string {
  if (typeof window === 'undefined') return ''
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

// ---- 公共 API ----

/** 建立 WebSocket 连接 */
export function connect(): void {
  if (socket) return

  const url = getWsUrl()
  if (!url) return

  socket = new WebSocket(url)

  socket.onopen = () => {
    connected = true
    console.log('[socket] connected')
  }

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      const type = msg.type as string
      const handlers = listeners.get(type)
      if (handlers) {
        for (const handler of handlers) {
          handler(msg.data ?? msg)
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  socket.onclose = () => {
    connected = false
    socket = null
    console.log('[socket] disconnected')
  }

  socket.onerror = () => {
    socket?.close()
  }
}

/** 断开连接 */
export function disconnect(): void {
  if (socket) {
    socket.close()
    socket = null
    connected = false
  }
}

/** 发送消息 */
function emit(type: string, data?: unknown): void {
  if (socket && connected) {
    socket.send(JSON.stringify({ type, data }))
  }
}

/** 注册消息监听 */
function on(type: string, handler: (data: unknown) => void): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, new Set())
  }
  listeners.get(type)!.add(handler)
  return () => {
    listeners.get(type)?.delete(handler)
  }
}

/** 标识当前用户 */
export function identify(userId: string): void {
  emit('identify', { userId })
}

// ---- 编辑器事件 ----

/** 监听 AI 应用事件 */
export function onAiApply(handler: (data: AiApplyEvent) => void): () => void {
  return on('ai:apply', handler as (data: unknown) => void)
}

/** 监听 AI 发布事件 */
export function onAiPublished(handler: (data: AiPublishedEvent) => void): () => void {
  return on('ai:published', handler as (data: unknown) => void)
}

/** 发送 AI 应用事件 */
export function emitAiApply(data: AiApplyEvent): void {
  emit('ai:apply', data)
}

/** 发送 AI 发布事件 */
export function emitAiPublished(data: AiPublishedEvent): void {
  emit('ai:published', data)
}

// ---- 流程通知 ----

/** 监听流程通知 */
export function onFlowNotification(handler: (data: FlowNotificationEvent) => void): () => void {
  return on('flow:notification', handler as (data: unknown) => void)
}
