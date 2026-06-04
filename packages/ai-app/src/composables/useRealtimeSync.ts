/**
 * Real-time Sync Composable
 *
 * Manages Socket.io connection for real-time message synchronization
 * between collaboration participants in AI conversations.
 */

import { ref, onUnmounted } from 'vue'
import {
  connect,
  disconnect,
  joinCollaboration,
  leaveCollaboration,
  onCollabAiSync,
  onCollabMessageStatus,
  onCollabGenerationStart,
  onCollabGenerationEnd,
  onCollabUserJoined,
  onCollabUserLeft,
  onCollabParticipants,
} from '@schema-form/socket'
import type {
  CollabAiSyncEvent,
  CollabMessageStatusEvent,
  CollabGenerationStartEvent,
  CollabParticipantEvent,
} from '@schema-form/socket'
import type { SSEEvent } from '@/types'

export interface UseRealtimeSyncOptions {
  /** 当前用户 ID */
  userId?: string
  /** Socket 服务端地址 */
  serverUrl?: string
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { userId = 'anonymous', serverUrl } = options

  // ---- State ----
  const connected = ref(false)
  const participants = ref<string[]>([])
  const isGenerating = ref(false)
  const generatingUser = ref<string | null>(null)

  // ---- Event handlers ----
  let onSyncEvent: ((event: SSEEvent) => void) | null = null
  let onStatusUpdate: ((update: CollabMessageStatusEvent) => void) | null = null

  // ---- Lifecycle ----

  /**
   * 初始化 Socket 连接
   */
  function init(): void {
    const socket = connect(serverUrl)
    if (!socket) return

    socket.on('connect', () => {
      connected.value = true
      console.log('[realtime] Connected to sync server')
    })

    socket.on('disconnect', () => {
      connected.value = false
      console.log('[realtime] Disconnected from sync server')
    })

    // 监听协作事件
    onCollabAiSync((data: CollabAiSyncEvent) => {
      if (onSyncEvent) {
        onSyncEvent(data.event as unknown as SSEEvent)
      }
    })

    onCollabMessageStatus((data: CollabMessageStatusEvent) => {
      if (onStatusUpdate) {
        onStatusUpdate(data)
      }
    })

    onCollabGenerationStart((data: CollabGenerationStartEvent) => {
      isGenerating.value = true
      generatingUser.value = data.userId ?? null
    })

    onCollabGenerationEnd(() => {
      isGenerating.value = false
      generatingUser.value = null
    })

    onCollabUserJoined((data: CollabParticipantEvent) => {
      participants.value = data.participants
      console.log(`[realtime] User joined: ${data.userId} (${data.participants.length} participants)`)
    })

    onCollabUserLeft((data: CollabParticipantEvent) => {
      participants.value = data.participants
      console.log(`[realtime] User left: ${data.userId} (${data.participants.length} participants)`)
    })

    onCollabParticipants((data: CollabParticipantEvent) => {
      participants.value = data.participants
    })
  }

  /**
   * 加入协作会话
   */
  function joinSession(conversationId: string): void {
    joinCollaboration(conversationId, userId)
  }

  /**
   * 离开协作会话
   */
  function leaveSession(conversationId: string): void {
    leaveCollaboration(conversationId)
    participants.value = []
    isGenerating.value = false
    generatingUser.value = null
  }

  /**
   * 注册 SSE 事件同步回调
   */
  function onSync(callback: (event: SSEEvent) => void): void {
    onSyncEvent = callback
  }

  /**
   * 注册消息状态更新回调
   */
  function onStatus(callback: (update: CollabMessageStatusEvent) => void): void {
    onStatusUpdate = callback
  }

  /**
   * 清理资源
   */
  function cleanup(): void {
    onSyncEvent = null
    onStatusUpdate = null
    disconnect()
    connected.value = false
    participants.value = []
    isGenerating.value = false
    generatingUser.value = null
  }

  // 自动清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    connected,
    participants,
    isGenerating,
    generatingUser,

    // Actions
    init,
    joinSession,
    leaveSession,
    onSync,
    onStatus,
    cleanup,
  }
}
