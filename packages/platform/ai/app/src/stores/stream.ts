/**
 * 流式连接管理 Store
 *
 * 职责：WebSocket 连接、流式消息处理、重试逻辑
 *
 * 命名说明：使用 WebSocket (Socket.IO) 实现流式通信，
 * 文件名 stream.ts 更准确地反映其职责。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  AIMessage,
  MentionReference,
  ChatContext,
  ChatSettings,
  Widget,
  FlowGraph,
  SSEEvent,
} from '@/types'
import {
  emitChatSend,
  emitChatCancel,
  emitChatResume,
  onChatEvent,
} from '@schema-form/platform-shared/socket'

export const useStreamStore = defineStore('stream', () => {
  // ---- State ----
  const streamStatus = ref<StreamConnectionStatus>('idle')
  const retryCount = ref(0)
  const lastMessagePayload = ref<{ content: string; mentions?: MentionReference[] } | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const MAX_AUTO_RETRIES = 3

  /** WebSocket 事件取消订阅函数 */
  let unsubscribeChatEvent: (() => void) | null = null
  /** 当前活跃的 done promise 解析函数（用于 stopGeneration 时提前结束） */
  let activeDoneResolve: (() => void) | null = null
  /** 标记当前流是否被用户主动停止 */
  let streamStopped = false

  // ---- Types ----

  type StreamConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

  // ---- Actions ----

  /**
   * 取消正在进行的请求
   */
  function cancelCurrent(): void {
    emitChatCancel()
    if (unsubscribeChatEvent) {
      unsubscribeChatEvent()
      unsubscribeChatEvent = null
    }
  }

  /**
   * 停止当前请求
   */
  function stopGeneration(): void {
    emitChatCancel()
    streamStopped = true
    if (unsubscribeChatEvent) {
      unsubscribeChatEvent()
      unsubscribeChatEvent = null
    }
    activeDoneResolve?.()
    activeDoneResolve = null
    retryCount.value = 0
    lastMessagePayload.value = null
  }

  /**
   * 核心流执行逻辑，支持自动重试。
   */
  async function executeStream(
    content: string,
    mentions: MentionReference[] | undefined,
    assistantIndex: number,
    messages: AIMessage[],
    handlers: {
      onStreamEvent: (event: SSEEvent, assistantIndex: number) => void
      onDone: (conversationId?: string) => void
      getContext: () => {
        context: ChatContext
        chatSettings: ChatSettings
        currentSchema: Widget[] | null
        currentFlow: FlowGraph | null
        currentConversationId: string | null
      }
    },
  ): Promise<void> {
    let attempts = 0

    while (attempts <= MAX_AUTO_RETRIES) {
      streamStatus.value = attempts === 0 ? 'connecting' : 'reconnecting'
      retryCount.value = attempts
      streamStopped = false

      // 清理上一次的事件监听
      if (unsubscribeChatEvent) {
        unsubscribeChatEvent()
        unsubscribeChatEvent = null
      }

      // 用 Promise 等待 done 事件，事件驱动而非轮询
      let doneEventReceived = false
      let firstChunkReceived = false
      let doneResolve: (() => void) | null = null

      const donePromise = new Promise<void>((resolve) => {
        doneResolve = resolve
        activeDoneResolve = resolve
      })

      // 监听 chat events
      unsubscribeChatEvent = onChatEvent((chatEvent) => {
        if (doneEventReceived) return

        if (!firstChunkReceived) {
          firstChunkReceived = true
          streamStatus.value = 'connected'
        }

        const event = chatEvent as unknown as SSEEvent
        console.log('[stream] received event', event.type, event.content?.substring(0, 20))

        if (event.type === 'done') {
          doneEventReceived = true
          doneResolve?.()
        }
        handlers.onStreamEvent(event, assistantIndex)
      })

      // 获取上下文
      const ctx = handlers.getContext()

      // 发送消息
      emitChatSend({
        conversationId: ctx.currentConversationId ?? undefined,
        message: content,
        context: {
          ...ctx.context,
          preferences: {
            ...ctx.context.preferences,
            replyLanguage: ctx.chatSettings.preferences.replyLanguage,
            replyStyle: ctx.chatSettings.preferences.replyStyle,
            codeComment: ctx.chatSettings.preferences.codeComment,
          },
          historySummary: ctx.chatSettings.historySummary.mode === 'manual'
            ? ctx.chatSettings.historySummary.manualSummary
            : ctx.context.historySummary,
          currentSchema: (ctx.currentSchema ?? undefined) as Record<string, unknown>[] | undefined,
          currentFlow: (ctx.currentFlow ?? undefined) as { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } | undefined,
        },
        mentions: mentions && mentions.length > 0 ? mentions : undefined,
      })

      // 等待 done 事件
      await donePromise

      streamStatus.value = 'idle'

      // 清理事件监听
      if (unsubscribeChatEvent) {
        unsubscribeChatEvent()
        unsubscribeChatEvent = null
      }
      activeDoneResolve = null

      if (!doneEventReceived && !streamStopped) {
        handlers.onDone(ctx.currentConversationId ?? undefined)
      }

      // 成功，跳出重试循环
      break
    }

    // 最终清理
    loading.value = false
    if (messages[assistantIndex].status === 'streaming') {
      messages[assistantIndex].status = 'received'
    }
  }

  /**
   * 响应 HITL interrupt：确认或拒绝。
   */
  async function executeResume(
    threadId: string,
    confirmed: boolean,
    messages: AIMessage[],
    handlers: {
      onStreamEvent: (event: SSEEvent, assistantIndex: number) => void
      onDone: (conversationId?: string) => void
      getContext: () => {
        currentConversationId: string | null
      }
    },
  ): Promise<void> {
    loading.value = true
    error.value = null

    // 准备 assistant 消息占位
    const assistantIndex = messages.length
    messages.push({
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'streaming',
    })

    streamStatus.value = 'connecting'

    // 监听 chat events
    let doneEventReceived = false
    let doneResolve: (() => void) | null = null
    const donePromise = new Promise<void>((resolve) => {
      doneResolve = resolve
    })

    if (unsubscribeChatEvent) {
      unsubscribeChatEvent()
      unsubscribeChatEvent = null
    }

    unsubscribeChatEvent = onChatEvent((chatEvent) => {
      streamStatus.value = 'connected'
      const event = chatEvent as unknown as SSEEvent
      if (event.type === 'done') {
        doneEventReceived = true
        doneResolve?.()
      }
      handlers.onStreamEvent(event, assistantIndex)
    })

    // 通过 WebSocket 恢复
    emitChatResume(threadId, confirmed)

    // 等待 done 事件
    await donePromise

    streamStatus.value = 'idle'

    if (unsubscribeChatEvent) {
      unsubscribeChatEvent()
      unsubscribeChatEvent = null
    }

    if (!doneEventReceived) {
      handlers.onDone()
    }

    loading.value = false
    if (messages[assistantIndex].status === 'streaming') {
      messages[assistantIndex].status = 'received'
    }
  }

  return {
    // state
    streamStatus,
    retryCount,
    lastMessagePayload,
    loading,
    error,
    // constants
    MAX_AUTO_RETRIES,
    // actions
    cancelCurrent,
    stopGeneration,
    executeStream,
    executeResume,
  }
})

/** @deprecated 使用 useStreamStore 替代 */
export const useSSEStore = useStreamStore
