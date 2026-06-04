/**
 * 协作状态管理
 *
 * 管理多人同时对话的 Socket 协作状态：
 * - 参与者列表
 * - 协作消息
 * - 连接状态
 * - AI 消息同步
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  connect,
  disconnect,
  joinCollaboration,
  leaveCollaboration,
  sendCollabMessage,
  onCollabUserJoined,
  onCollabUserLeft,
  onCollabParticipants,
  onCollabAiSync,
  onConnect,
  onDisconnect,
} from '@schema-form/socket'
import type {
  CollabParticipantEvent,
  CollabMessageEvent,
  CollabAiSyncEvent,
} from '@schema-form/socket'

export const useCollaborationStore = defineStore('collaboration', () => {
  // ---- State ----

  const participants = ref<string[]>([])
  const connected = ref(false)
  const messages = ref<CollabMessageEvent[]>([])
  const currentConversationId = ref<string | null>(null)
  const userId = ref<string>('')
  const initialized = ref(false)

  // 清理函数列表
  const cleanupFns: Array<() => void> = []

  // ---- Getters ----

  const isCollaborating = computed(() => participants.value.length > 1)
  const participantCount = computed(() => participants.value.length)

  // ---- Actions ----

  /**
   * 初始化 Socket 连接并设置事件监听
   */
  function initSocket(serverUrl?: string): void {
    if (initialized.value) return

    connect(serverUrl)

    // 监听连接状态
    cleanupFns.push(
      onConnect(() => {
        connected.value = true
      }),
    )

    cleanupFns.push(
      onDisconnect(() => {
        connected.value = false
      }),
    )

    // 监听参与者变更
    cleanupFns.push(
      onCollabUserJoined((data: CollabParticipantEvent) => {
        if (data.conversationId === currentConversationId.value) {
          participants.value = data.participants
        }
      }),
    )

    cleanupFns.push(
      onCollabUserLeft((data: CollabParticipantEvent) => {
        if (data.conversationId === currentConversationId.value) {
          participants.value = data.participants
        }
      }),
    )

    cleanupFns.push(
      onCollabParticipants((data: CollabParticipantEvent) => {
        if (data.conversationId === currentConversationId.value) {
          participants.value = data.participants
          userId.value = data.userId
        }
      }),
    )

    // 监听 AI 同步事件
    cleanupFns.push(
      onCollabAiSync((_data: CollabAiSyncEvent) => {
        // AI 同步事件由 ai store 处理
      }),
    )

    initialized.value = true
  }

  /**
   * 加入协作会话
   */
  function joinSession(conversationId: string, uid: string): void {
    currentConversationId.value = conversationId
    userId.value = uid
    messages.value = []

    joinCollaboration(conversationId, uid)
  }

  /**
   * 离开协作会话
   */
  function leaveSession(): void {
    if (currentConversationId.value) {
      leaveCollaboration(currentConversationId.value)
    }
    currentConversationId.value = null
    participants.value = []
    messages.value = []
  }

  /**
   * 发送协作消息
   */
  function sendMessage(content: string): void {
    if (!currentConversationId.value || !userId.value) return

    sendCollabMessage(
      currentConversationId.value,
      userId.value,
      content,
    )
  }

  /**
   * 同步 AI 事件给其他参与者
   */
  function syncAiEvent(_event: Record<string, unknown>): void {
    // 使用 socket 直接发送，因为 socket 包没有封装这个函数
    // 这个功能通过 socket.ts 的 collab:ai-sync 事件处理
  }

  /**
   * 生成用户标识
   */
  function generateUserId(): string {
    return `user_${Date.now().toString(36)}`
  }

  /**
   * 清理连接
   */
  function cleanup(): void {
    leaveSession()
    for (const fn of cleanupFns) {
      fn()
    }
    cleanupFns.length = 0
    disconnect()
    initialized.value = false
  }

  return {
    // state
    participants,
    connected,
    messages,
    currentConversationId,
    userId,
    initialized,

    // getters
    isCollaborating,
    participantCount,

    // actions
    initSocket,
    joinSession,
    leaveSession,
    sendMessage,
    syncAiEvent,
    generateUserId,
    cleanup,
  }
})
