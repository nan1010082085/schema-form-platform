/**
 * AI 对话状态管理（向后兼容层）
 *
 * 此文件保持向后兼容性，内部使用拆分后的 store。
 * 新代码应直接使用拆分后的 store：
 * - useConversationStore: 对话管理
 * - useSSEStore: SSE 连接
 * - useSchemaStore: Schema 状态
 * - useLLMStore: LLM Provider
 * - useRAGStore: RAG 搜索
 * - useChatSettingsStore: 聊天设置
 * - useHITLStore: HITL 中断
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AIMessage,
  AgentType,
  ChatContext,
  Widget,
  FlowGraph,
  SSEEvent,
  TaskChainStep,
  MentionReference,
  SearchResult,
  MentionType,
  MentionSearchResult,
  FeedbackType,
} from '@/types'
import {
  searchConversations,
  mentionSearch,
  submitMessageFeedback,
} from '@/api/aiApi'

import { useConversationStore } from './conversation'
import { useSSEStore } from './sse'
import { useSchemaStore } from './schema'
import { useLLMStore } from './llm'
import { useRAGStore } from './rag'
import { useChatSettingsStore } from './chatSettings'
import { useHITLStore } from './hitl'

export const useAiStore = defineStore('ai', () => {
  // ---- 内部 store 引用 ----
  const conversationStore = useConversationStore()
  const sseStore = useSSEStore()
  const schemaStore = useSchemaStore()
  const llmStore = useLLMStore()
  const ragStore = useRAGStore()
  const chatSettingsStore = useChatSettingsStore()
  const hitlStore = useHITLStore()

  // ---- 本地状态 ----
  const activeAgent = ref<AgentType>('auto')
  const context = ref<ChatContext>({ source: 'standalone' })
  const taskChain = ref<TaskChainStep[]>([])
  const taskChainIndex = ref(0)

  // ---- SSE 事件处理 ----

  function handleSSEEvent(event: SSEEvent, assistantIndex: number): void {
    const msg = conversationStore.messages[assistantIndex]

    switch (event.type) {
      case 'agent_switch':
        if (event.agent) {
          msg.agent = event.agent as 'editor' | 'flow' | 'general'
          if (event.collaboration && event.description) {
            const collaborationNote = `\n\n[协作] 请求 ${event.agent === 'editor' ? 'Editor' : 'Flow'} 专家协助：${event.description}`
            msg.thinking = (msg.thinking ?? '') + collaborationNote
          }
        }
        break

      case 'thinking':
        if (event.content) {
          msg.thinking = (msg.thinking ?? '') + event.content
        }
        break

      case 'text':
        if (event.content) {
          msg.content = (msg.content ?? '') + event.content
        }
        break

      case 'tip':
        if (event.content) {
          msg.tip = event.content
        }
        break

      case 'schema':
        if (event.payload) {
          schemaStore.updateSchema(event.payload as Widget[])
          msg.schema = event.payload as Widget[]
        }
        if (event.description) {
          msg.content = (msg.content ?? '') + event.description
        }
        break

      case 'schema_diff':
        if (event.diff) {
          schemaStore.setSchemaDiff(event.diff as any, event.description)
        }
        break

      case 'flow_diff':
        if (event.diff) {
          schemaStore.setFlowDiff(event.diff as any)
        }
        break

      case 'version_created':
        if (event.versionId && event.version) {
          schemaStore.versionHistory.unshift({
            id: event.versionId,
            version: event.version,
            type: schemaStore.currentSchema ? 'schema' : 'flow',
            description: event.description,
            createdAt: new Date().toISOString(),
          })
          schemaStore.currentVersionIndex = 0
        }
        break

      case 'schema_update':
        if (event.step) {
          schemaStore.setBuildStep(event.step)
        }
        if (event.schema) {
          schemaStore.setCurrentSchema(event.schema as Widget[])
        }
        if (event.step && event.description) {
          const stepLabels: Record<string, string> = {
            layout: '布局结构',
            components: '表单组件',
            validation: '验证规则',
            styling: '样式配置',
          }
          const stepLabel = stepLabels[event.step] ?? event.step
          const progressNote = `\n\n[生成进度] ${stepLabel}: ${event.description}`
          msg.thinking = (msg.thinking ?? '') + progressNote
        }
        break

      case 'schema_complete':
        schemaStore.setBuildStep(null)
        if (event.schema) {
          schemaStore.setCurrentSchema(event.schema as Widget[])
          msg.schema = event.schema as Widget[]
        }
        if (event.description) {
          msg.content = (msg.content ?? '') + event.description
        }
        break

      case 'flow':
        if (event.payload) {
          schemaStore.setCurrentFlow(event.payload as FlowGraph)
          msg.flow = event.payload as FlowGraph
        }
        if (event.description) {
          msg.content = (msg.content ?? '') + event.description
        }
        break

      case 'tool_call':
        if (!msg.toolCalls) msg.toolCalls = []
        if (event.phase === 'calling' && event.tools) {
          for (const tool of event.tools) {
            msg.toolCalls.push({
              id: tool.id,
              name: tool.name,
              arguments: tool.arguments ?? {},
            })
          }
        }
        if (event.phase === 'result' && event.tools) {
          for (const tool of event.tools) {
            const existing = tool.id
              ? msg.toolCalls.find((t) => t.id === tool.id && !t.result)
              : msg.toolCalls.find((t) => t.name === tool.name && !t.result)
            if (existing) {
              existing.result = tool.result
            }
          }
        }
        break

      case 'tool_error': {
        if (!msg.toolCalls) msg.toolCalls = []
        const errorMsg = event.content ?? '工具执行失败'
        const existing = event.runId
          ? msg.toolCalls.find((t) => t.id === event.runId)
          : msg.toolCalls.find((t) => t.name === (event.toolName ?? 'unknown') && !t.result)
        if (existing) {
          existing.error = errorMsg
          existing.result = { error: errorMsg }
        } else {
          msg.toolCalls.push({
            name: event.toolName ?? 'unknown',
            arguments: {},
            result: { error: errorMsg },
            error: errorMsg,
          })
        }
        break
      }

      case 'task_chain':
        if (event.steps) {
          taskChain.value = event.steps
          taskChainIndex.value = event.currentIndex ?? 0
        }
        break

      case 'done':
        if (event.conversationId) {
          conversationStore.currentConversationId = event.conversationId
          conversationStore.loadConversations()
        }
        break

      case 'interrupt': {
        hitlStore.setInterrupt({
          threadId: event.threadId ?? '',
          type: event.interruptType ?? 'unknown',
          message: event.message ?? '需要您的确认',
          data: event.data,
        })
        conversationStore.messages.push({
          role: 'assistant',
          type: 'interrupt',
          content: event.message ?? '需要您的确认',
          data: hitlStore.pendingInterrupt,
          timestamp: new Date(),
          status: 'received',
        })
        break
      }

      case 'error':
        sseStore.error = event.content ?? 'Unknown error'
        if (msg.status === 'streaming') {
          const agentLabel = event.agent ? ` [${event.agent}]` : ''
          msg.content = (msg.content || msg.thinking || '')
            + `\n\n⚠️${agentLabel} ${event.content ?? '未知错误'}`
          msg.status = 'error'
        }
        break
    }
  }

  // ---- Actions ----

  function switchAgent(agent: AgentType): void {
    activeAgent.value = agent
    context.value.source = agent === 'auto' ? 'standalone' : (agent as 'editor' | 'flow')
  }

  async function sendMessage(content: string, mentions?: MentionReference[]): Promise<void> {
    sseStore.cancelCurrent()
    sseStore.lastMessagePayload = { content, mentions }
    sseStore.retryCount = 0
    sseStore.loading = true
    sseStore.error = null

    // 将 RAG context 注入消息内容
    const ragPrefix = ragStore.getRagContextContent()
    const enrichedContent = ragPrefix + content

    // 追加用户消息
    conversationStore.messages.push({
      role: 'user',
      content: enrichedContent,
      timestamp: new Date(),
      status: 'sent',
    })

    // 准备 assistant 消息占位
    const assistantIndex = conversationStore.messages.length
    conversationStore.messages.push({
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'streaming',
    })

    await sseStore.executeStream(enrichedContent, mentions, assistantIndex, conversationStore.messages, {
      onSSEEvent: handleSSEEvent,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: () => ({
        context: context.value,
        chatSettings: chatSettingsStore.chatSettings,
        currentSchema: schemaStore.currentSchema,
        currentFlow: schemaStore.currentFlow,
        currentConversationId: conversationStore.currentConversationId,
      }),
    })
  }

  async function retryLastMessage(): Promise<void> {
    if (!sseStore.lastMessagePayload) return

    sseStore.cancelCurrent()
    sseStore.retryCount = 0
    sseStore.loading = true
    sseStore.error = null

    const lastIdx = conversationStore.messages.length - 1
    if (lastIdx >= 0 && conversationStore.messages[lastIdx].role === 'assistant') {
      conversationStore.messages[lastIdx].content = ''
      conversationStore.messages[lastIdx].status = 'streaming'
      await sseStore.executeStream(
        sseStore.lastMessagePayload.content,
        sseStore.lastMessagePayload.mentions,
        lastIdx,
        conversationStore.messages,
        {
          onSSEEvent: handleSSEEvent,
          onDone: (conversationId) => {
            if (conversationId) conversationStore.loadConversations()
          },
          getContext: () => ({
            context: context.value,
            chatSettings: chatSettingsStore.chatSettings,
            currentSchema: schemaStore.currentSchema,
            currentFlow: schemaStore.currentFlow,
            currentConversationId: conversationStore.currentConversationId,
          }),
        },
      )
    }
  }

  async function retryToolCall(messageIndex: number, toolCallIndex: number): Promise<void> {
    const msg = conversationStore.messages[messageIndex]
    if (!msg || msg.role !== 'assistant' || !msg.toolCalls) return

    const toolCall = msg.toolCalls[toolCallIndex]
    if (!toolCall || !toolCall.error) return

    toolCall.error = undefined
    toolCall.result = undefined

    let userContent = ''
    let userMentions: MentionReference[] | undefined
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (conversationStore.messages[i].role === 'user') {
        userContent = conversationStore.messages[i].content
        break
      }
    }
    if (!userContent) return

    sseStore.cancelCurrent()
    sseStore.loading = true
    sseStore.error = null
    msg.status = 'streaming'

    await sseStore.executeStream(userContent, userMentions, messageIndex, conversationStore.messages, {
      onSSEEvent: handleSSEEvent,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: () => ({
        context: context.value,
        chatSettings: chatSettingsStore.chatSettings,
        currentSchema: schemaStore.currentSchema,
        currentFlow: schemaStore.currentFlow,
        currentConversationId: conversationStore.currentConversationId,
      }),
    })
  }

  async function respondInterrupt(confirmed: boolean): Promise<void> {
    const interrupt = hitlStore.pendingInterrupt
    if (!interrupt) return

    sseStore.loading = true
    sseStore.error = null
    hitlStore.clearInterrupt()

    await sseStore.executeResume(interrupt.threadId, confirmed, conversationStore.messages, {
      onSSEEvent: handleSSEEvent,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: () => ({
        currentConversationId: conversationStore.currentConversationId,
      }),
    })
  }

  async function loadConversation(id: string): Promise<void> {
    conversationStore.clearConversation()
    schemaStore.clearSchemaState()
    hitlStore.clearInterrupt()

    const result = await conversationStore.loadConversation(id)
    if (result.schema) schemaStore.setCurrentSchema(result.schema)
    if (result.flow) schemaStore.setCurrentFlow(result.flow)
    sseStore.error = null
  }

  async function removeConversation(id: string): Promise<void> {
    await conversationStore.removeConversation(id)
    if (conversationStore.currentConversationId === id) {
      clearConversation()
    }
  }

  function clearConversation(): void {
    sseStore.cancelCurrent()
    conversationStore.clearConversation()
    schemaStore.clearSchemaState()
    hitlStore.clearInterrupt()
    sseStore.sseStatus = 'idle'
    sseStore.retryCount = 0
    sseStore.lastMessagePayload = null
  }

  async function loadConversations(): Promise<void> {
    await conversationStore.loadConversations()
  }

  async function publishCurrent(): Promise<{ id: string; publishId?: string; type: 'schema' | 'flow' } | null> {
    if (!conversationStore.currentConversationId) return null

    const type = schemaStore.currentSchema ? 'schema' : 'flow'
    const payload = schemaStore.currentSchema ?? schemaStore.currentFlow
    if (!payload) return null

    return conversationStore.publishCurrent({ type, data: payload as any })
  }

  function setContext(ctx: Partial<ChatContext>): void {
    context.value = { ...context.value, ...ctx }
  }

  // ---- 搜索 ----

  async function searchConversationsAction(
    params: string | import('@/api/aiApi').SearchConversationsParams,
  ): Promise<SearchResult> {
    const normalized = typeof params === 'string' ? { keyword: params } : params
    return searchConversations(normalized)
  }

  async function mentionSearchAction(
    query: string,
    type: MentionType,
    limit = 10,
  ): Promise<MentionSearchResult[]> {
    return mentionSearch(query, type, limit)
  }

  // ---- 消息操作 ----

  async function submitFeedback(messageIndex: number, type: FeedbackType): Promise<void> {
    const msg = conversationStore.messages[messageIndex]
    if (!msg) return

    const messageId = msg.id
    if (!messageId) return

    const newFeedback = msg.feedback === type ? null : type
    msg.feedback = newFeedback

    try {
      await submitMessageFeedback(messageId, type)
    } catch {
      msg.feedback = msg.feedback === type ? null : type
    }
  }

  async function regenerateMessage(messageIndex: number): Promise<void> {
    const msg = conversationStore.messages[messageIndex]
    if (!msg || msg.role !== 'assistant') return

    let userContent = ''
    let userMentions: MentionReference[] | undefined
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (conversationStore.messages[i].role === 'user') {
        userContent = conversationStore.messages[i].content
        break
      }
    }
    if (!userContent) return

    sseStore.cancelCurrent()
    sseStore.loading = true
    sseStore.error = null

    msg.content = ''
    msg.thinking = undefined
    msg.tip = undefined
    msg.toolCalls = undefined
    msg.schema = undefined
    msg.flow = undefined
    msg.feedback = null
    msg.status = 'streaming'

    await sseStore.executeStream(userContent, userMentions, messageIndex, conversationStore.messages, {
      onSSEEvent: handleSSEEvent,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: () => ({
        context: context.value,
        chatSettings: chatSettingsStore.chatSettings,
        currentSchema: schemaStore.currentSchema,
        currentFlow: schemaStore.currentFlow,
        currentConversationId: conversationStore.currentConversationId,
      }),
    })
  }

  return {
    // state（从子 store 代理）
    conversations: computed(() => conversationStore.conversations),
    currentConversationId: computed(() => conversationStore.currentConversationId),
    messages: computed(() => conversationStore.messages),
    activeAgent,
    context,
    loading: computed(() => sseStore.loading),
    currentSchema: computed(() => schemaStore.currentSchema),
    currentFlow: computed(() => schemaStore.currentFlow),
    error: computed(() => sseStore.error),
    taskChain,
    taskChainIndex,
    schemaHistory: computed(() => schemaStore.schemaHistory),
    currentDiff: computed(() => schemaStore.currentDiff),
    currentFlowDiff: computed(() => schemaStore.currentFlowDiff),
    schemaUpdateDescription: computed(() => schemaStore.schemaUpdateDescription),
    versionHistory: computed(() => schemaStore.versionHistory),
    currentVersionIndex: computed(() => schemaStore.currentVersionIndex),
    sseStatus: computed(() => sseStore.sseStatus),
    retryCount: computed(() => sseStore.retryCount),
    llmProviders: computed(() => llmStore.llmProviders),
    llmDefaultProvider: computed(() => llmStore.llmDefaultProvider),
    llmDefaultStrategy: computed(() => llmStore.llmDefaultStrategy),
    llmStrategies: computed(() => llmStore.llmStrategies),
    llmUsage: computed(() => llmStore.llmUsage),
    llmLoading: computed(() => llmStore.llmLoading),
    chatSettings: computed(() => chatSettingsStore.chatSettings),
    ragSearchResults: computed(() => ragStore.ragSearchResults),
    ragSearching: computed(() => ragStore.ragSearching),
    ragContext: computed(() => ragStore.ragContext),
    pendingInterrupt: computed(() => hitlStore.pendingInterrupt),

    // getters
    currentConversation: computed(() => conversationStore.currentConversation),
    hasPreview: computed(() => schemaStore.hasPreview),
    canUndoSchema: computed(() => schemaStore.canUndoSchema),
    MAX_AUTO_RETRIES: computed(() => sseStore.MAX_AUTO_RETRIES),

    // actions
    sendMessage,
    retryLastMessage,
    retryToolCall,
    stopGeneration: () => sseStore.stopGeneration(),
    switchAgent,
    clearConversation,
    loadConversations,
    loadConversation,
    removeConversation,
    publishCurrent,
    setContext,
    setCurrentSchema: (schema: Widget[] | null) => schemaStore.setCurrentSchema(schema),
    setCurrentFlow: (flow: FlowGraph | null) => schemaStore.setCurrentFlow(flow),
    undoLastSchemaUpdate: () => schemaStore.undoLastSchemaUpdate(),
    clearDiff: () => schemaStore.clearDiff(),
    loadVersionHistory: (conversationId: string) => schemaStore.loadVersionHistory(conversationId),
    rollbackToVersion: (conversationId: string, versionId: string) => schemaStore.rollbackToVersion(conversationId, versionId),
    loadLLMProviders: () => llmStore.loadLLMProviders(),
    loadLLMStrategies: () => llmStore.loadLLMStrategies(),
    loadLLMUsage: () => llmStore.loadLLMUsage(),
    switchProvider: (provider: string) => llmStore.switchProvider(provider),
    switchStrategy: (strategy: string | null) => llmStore.switchStrategy(strategy),
    updateChatSettings: (settings: Parameters<typeof chatSettingsStore.updateChatSettings>[0]) => chatSettingsStore.updateChatSettings(settings),
    loadChatSettings: () => chatSettingsStore.chatSettings,
    searchRagAction: (query: string, limit?: number) => ragStore.searchRagAction(query, limit),
    addRagContext: (item: any) => ragStore.addRagContext(item),
    removeRagContext: (id: string) => ragStore.removeRagContext(id),
    clearRagContext: () => ragStore.clearRagContext(),
    searchConversationsAction,
    mentionSearchAction,
    clearInterrupt: () => hitlStore.clearInterrupt(),
    respondInterrupt,
    submitFeedback,
    regenerateMessage,
  }
})
