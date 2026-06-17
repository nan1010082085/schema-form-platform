/**
 * 对话管理 Store
 *
 * 职责：对话列表、当前对话、消息管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIMessage, Conversation, Widget, FlowGraph } from '@/types'
import {
  getConversations,
  getConversationDetail,
  deleteConversation,
  publish,
} from '@/api/aiApi'

export const useConversationStore = defineStore('conversation', () => {
  // ---- State ----
  const conversations = ref<Conversation[]>([])
  const currentConversationId = ref<string | null>(null)
  const messages = ref<AIMessage[]>([])

  // ---- Getters ----
  const currentConversation = computed(() =>
    conversations.value.find((c) => c.id === currentConversationId.value) ?? null,
  )

  // ---- Actions ----
  async function loadConversations(): Promise<void> {
    conversations.value = await getConversations()
  }

  async function loadConversation(id: string): Promise<{
    messages: AIMessage[]
    schema: Widget[] | null
    flow: FlowGraph | null
  }> {
    const detail = await getConversationDetail(id)
    currentConversationId.value = detail.id

    const parsedMessages = detail.messages.map((m) => ({
      id: (m as Record<string, unknown>).id as string | undefined,
      role: m.role as AIMessage['role'],
      content: m.content,
      thinking: (m as Record<string, unknown>).thinking as string | undefined,
      tip: (m as Record<string, unknown>).tip as string | undefined,
      toolCalls: (m as Record<string, unknown>).toolCalls as AIMessage['toolCalls'],
      schema: m.schema as Widget[] | undefined,
      flow: m.flow as FlowGraph | undefined,
      timestamp: new Date(m.timestamp),
      feedback: (m as Record<string, unknown>).feedback as 'positive' | 'negative' | null | undefined,
    }))

    messages.value = parsedMessages

    // Restore preview state from last assistant message
    const lastAssistant = [...detail.messages].reverse().find((m) => m.role === 'assistant')

    return {
      messages: parsedMessages,
      schema: (lastAssistant?.schema as Widget[]) ?? null,
      flow: (lastAssistant?.flow as FlowGraph) ?? null,
    }
  }

  async function removeConversation(id: string): Promise<void> {
    await deleteConversation(id)
    conversations.value = conversations.value.filter((c) => c.id !== id)
  }

  function clearConversation(): void {
    currentConversationId.value = null
    messages.value = []
  }

  async function publishCurrent(payload: {
    type: 'schema' | 'flow'
    data: Widget[] | FlowGraph
  }): Promise<{ id: string; publishId?: string; type: 'schema' | 'flow' } | null> {
    if (!currentConversationId.value) return null

    const result = await publish({
      conversationId: currentConversationId.value,
      type: payload.type,
      payload: payload.data,
    })

    return { id: result.id, publishId: result.publishId, type: payload.type }
  }

  return {
    // state
    conversations,
    currentConversationId,
    messages,
    // getters
    currentConversation,
    // actions
    loadConversations,
    loadConversation,
    removeConversation,
    clearConversation,
    publishCurrent,
  }
})
