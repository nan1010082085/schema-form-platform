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
  CollabAiSyncEvent,
  CollabMessageStatusEvent,
  CollabGenerationStartEvent,
  CollabGenerationEndEvent,
  CollabParticipantEvent,
  CollabMessageEvent,
} from './events.js'

type EventHandler<T> = (data: T) => void

let socket: Socket | null = null

/**
 * 连接到 Socket 服务端
 * @param url 服务端地址。不传时默认同源，由 nginx（生产）或 vite proxy（开发）转发到后端。
 */
export function connect(url?: string): Socket {
  if (socket?.connected) return socket

  const serverUrl = url ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')
  socket = io(serverUrl, {
    path: '/ws',
    transports: ['polling'],
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

/**
 * 注册用户身份（加入个人房间以接收通知推送）
 */
export function identify(userId: string): void {
  socket?.emit('identify', userId)
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

// ---- 协作会话 ----

/**
 * 加入协作会话
 */
export function joinCollaboration(conversationId: string, userId: string): void {
  socket?.emit(SOCKET_EVENTS.COLLAB_JOIN, { conversationId, userId })
}

/**
 * 离开协作会话
 */
export function leaveCollaboration(conversationId: string): void {
  socket?.emit(SOCKET_EVENTS.COLLAB_LEAVE, { conversationId })
}

/**
 * 监听 AI SSE 事件同步（来自其他协作参与者）
 */
export function onCollabAiSync(handler: EventHandler<CollabAiSyncEvent>): () => void {
  socket?.on(SOCKET_EVENTS.COLLAB_AI_SYNC, handler)
  return () => { socket?.off(SOCKET_EVENTS.COLLAB_AI_SYNC, handler) }
}

/**
 * 监听消息状态更新
 */
export function onCollabMessageStatus(handler: EventHandler<CollabMessageStatusEvent>): () => void {
  socket?.on(SOCKET_EVENTS.COLLAB_MESSAGE_STATUS, handler)
  return () => { socket?.off(SOCKET_EVENTS.COLLAB_MESSAGE_STATUS, handler) }
}

/**
 * 监听生成开始
 */
export function onCollabGenerationStart(handler: EventHandler<CollabGenerationStartEvent>): () => void {
  socket?.on(SOCKET_EVENTS.COLLAB_GENERATION_START, handler)
  return () => { socket?.off(SOCKET_EVENTS.COLLAB_GENERATION_START, handler) }
}

/**
 * 监听生成结束
 */
export function onCollabGenerationEnd(handler: EventHandler<CollabGenerationEndEvent>): () => void {
  socket?.on(SOCKET_EVENTS.COLLAB_GENERATION_END, handler)
  return () => { socket?.off(SOCKET_EVENTS.COLLAB_GENERATION_END, handler) }
}

/**
 * 监听用户加入协作
 */
export function onCollabUserJoined(handler: EventHandler<CollabParticipantEvent>): () => void {
  socket?.on(SOCKET_EVENTS.COLLAB_USER_JOINED, handler)
  return () => { socket?.off(SOCKET_EVENTS.COLLAB_USER_JOINED, handler) }
}

/**
 * 监听用户离开协作
 */
export function onCollabUserLeft(handler: EventHandler<CollabParticipantEvent>): () => void {
  socket?.on(SOCKET_EVENTS.COLLAB_USER_LEFT, handler)
  return () => { socket?.off(SOCKET_EVENTS.COLLAB_USER_LEFT, handler) }
}

/**
 * 监听参与者列表更新
 */
export function onCollabParticipants(handler: EventHandler<CollabParticipantEvent>): () => void {
  socket?.on(SOCKET_EVENTS.COLLAB_PARTICIPANTS, handler)
  return () => { socket?.off(SOCKET_EVENTS.COLLAB_PARTICIPANTS, handler) }
}

/**
 * 发送协作消息
 */
export function sendCollabMessage(conversationId: string, userId: string, content: string): void {
  socket?.emit(SOCKET_EVENTS.COLLAB_SEND_MESSAGE, { conversationId, userId, content })
}

/**
 * 监听新协作消息
 */
export function onCollabNewMessage(handler: EventHandler<CollabMessageEvent>): () => void {
  socket?.on(SOCKET_EVENTS.COLLAB_NEW_MESSAGE, handler)
  return () => { socket?.off(SOCKET_EVENTS.COLLAB_NEW_MESSAGE, handler) }
}

// ---- 通知事件 ----

/** 通知推送数据 */
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

/**
 * 监听新流程通知
 */
export function onFlowNotification(handler: EventHandler<FlowNotificationEvent>): () => void {
  socket?.on(SOCKET_EVENTS.FLOW_NOTIFICATION, handler)
  return () => { socket?.off(SOCKET_EVENTS.FLOW_NOTIFICATION, handler) }
}
