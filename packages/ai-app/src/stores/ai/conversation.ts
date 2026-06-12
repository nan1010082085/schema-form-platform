/**
 * AI 对话状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIMessage, Conversation, ChatContext, AgentType } from '@/types'
import { getConversations, getConversationDetail, deleteConversation } from '@/api/aiApi'

export const useConversationStore = defineStore('ai-conversation', () => {
  const conversations = ref<Conversation[]>([])
  const currentConversationId = ref<string | null>(null)
  const messages = ref<AIMessage[]>([])
  const activeAgent = ref<AgentType>('auto')
  const context = ref<ChatContext>({ source: 'standalone' })

  const currentConversation = computed(() =>
    conversations.value.find(c => c.id === currentConversationId.value) ?? null,
  )

  async function fetchConversations() {
    const data = await getConversations()
    conversations.value = data
  }

  async function fetchConversationDetail(id: string) {
    const data = await getConversationDetail(id)
    currentConversationId.value = id
    messages.value = data.messages
  }

  async function removeConversation(id: string) {
    await deleteConversation(id)
    conversations.value = conversations.value.filter(c => c.id !== id)
    if (currentConversationId.value === id) {
      currentConversationId.value = null
      messages.value = []
    }
  }

  function setCurrentConversation(id: string | null) {
    currentConversationId.value = id
  }

  function addMessage(message: AIMessage) {
    messages.value.push(message)
  }

  function clearMessages() {
    messages.value = []
  }

  function setContext(newContext: Partial<ChatContext>) {
    context.value = { ...context.value, ...newContext }
  }

  function setActiveAgent(agent: AgentType) {
    activeAgent.value = agent
  }

  return {
    conversations,
    currentConversationId,
    messages,
    activeAgent,
    context,
    currentConversation,
    fetchConversations,
    fetchConversationDetail,
    removeConversation,
    setCurrentConversation,
    addMessage,
    clearMessages,
    setContext,
    setActiveAgent,
  }
})
