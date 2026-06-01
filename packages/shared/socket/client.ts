/**
 * Socket 客户端封装
 *
 * 所有前端项目（ai-app、editor、flow）共用此模块连接服务端 Socket。
 */

import { io, Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from './events.js'
import type {
  AiApplyEvent,
  AiPublishedEvent,
} from './events.js'

type EventHandler<T> = (data: T) => void

let socket: Socket | null = null

/**
 * 连接到 Socket 服务端
 * @param url 服务端地址，默认 http://localhost:3001
 */
export function connect(url?: string): Socket {
  if (socket?.connected) return socket

  const serverUrl = url ?? 'http://localhost:3001'
  socket = io(serverUrl, {
    path: '/ws',
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  return socket
}

/**
 * 获取当前 Socket 实例
 */
export function getSocket(): Socket | null {
  return socket
}

/**
 * 断开连接
 */
export function disconnect(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/**
 * 加入房间（Editor 或 Flow 的工作区）
 */
export function joinRoom(room: string): void {
  socket?.emit('join', room)
}

/**
 * 离开房间
 */
export function leaveRoom(room: string): void {
  socket?.emit('leave', room)
}

// ---- AI 端：发送事件 ----

/**
 * AI 发送生成结果到宿主
 */
export function emitAiApply(data: AiApplyEvent, room?: string): void {
  socket?.emit(SOCKET_EVENTS.AI_APPLY, { ...data, room })
}

/**
 * AI 通知发布完成
 */
export function emitAiPublished(data: AiPublishedEvent, room?: string): void {
  socket?.emit(SOCKET_EVENTS.AI_PUBLISHED, { ...data, room })
}

// ---- 宿主端：监听事件 ----

/**
 * 监听 AI 应用请求
 */
export function onAiApply(handler: EventHandler<AiApplyEvent>): () => void {
  socket?.on(SOCKET_EVENTS.AI_APPLY, handler)
  return () => { socket?.off(SOCKET_EVENTS.AI_APPLY, handler) }
}

/**
 * 监听 AI 发布完成
 */
export function onAiPublished(handler: EventHandler<AiPublishedEvent>): () => void {
  socket?.on(SOCKET_EVENTS.AI_PUBLISHED, handler)
  return () => { socket?.off(SOCKET_EVENTS.AI_PUBLISHED, handler) }
}

/**
 * 监听连接状态变化
 */
export function onConnect(handler: () => void): () => void {
  socket?.on(SOCKET_EVENTS.CONNECT, handler)
  return () => { socket?.off(SOCKET_EVENTS.CONNECT, handler) }
}

export function onDisconnect(handler: () => void): () => void {
  socket?.on(SOCKET_EVENTS.DISCONNECT, handler)
  return () => { socket?.off(SOCKET_EVENTS.DISCONNECT, handler) }
}
