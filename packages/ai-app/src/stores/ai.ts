/**
 * AI 对话状态管理
 *
 * 职责：对话列表、当前对话消息、加载状态、生成物状态。
 * 不包含复杂业务逻辑 —— 那些由 composables 或组件层处理。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AIMessage,
  AgentType,
  ChatContext,
  ChatSettings,
  Conversation,
  Widget,
  FlowGraph,
  SSEEvent,
  TaskChainStep,
  MentionReference,
  SSEConnectionStatus,
  SchemaDiff,
  FlowDiff,
  VersionEntry,
  RagSearchResult,
  PendingInterrupt,
} from '@/types'
import {
  chat,
  getConversations,
  getConversationDetail,
  deleteConversation,
  publish,
  getVersions,
  rollbackVersion,
  getLLMProviders,
  switchLLMProvider,
  getLLMUsage,
  getLLMStrategies,
  switchLLMStrategy,
  searchRag,
  searchConversations,
  mentionSearch,
  resumeInterrupt,
  type LLMProviderInfo,
  type LLMAggregatedUsage,
  type MentionSearchResult,
  type MentionType,
  type SearchResult,
} from '@/api/aiApi'

export const useAiStore = defineStore('ai', () => {
  // ---- State ----

  const conversations = ref<Conversation[]>([])
  const currentConversationId = ref<string | null>(null)
  const messages = ref<AIMessage[]>([])
  const activeAgent = ref<AgentType>('auto')
  const context = ref<ChatContext>({ source: 'standalone' })
  const loading = ref(false)
  const currentSchema = ref<Widget[] | null>(null)
  const currentFlow = ref<FlowGraph | null>(null)
  const error = ref<string | null>(null)
  const taskChain = ref<TaskChainStep[]>([])
  const taskChainIndex = ref(0)
  const abortController = ref<AbortController | null>(null)

  // ---- SSE 连接状态与重试 ----
  const sseStatus = ref<SSEConnectionStatus>('idle')
  const retryCount = ref(0)
  const lastMessagePayload = ref<{ content: string; mentions?: MentionReference[] } | null>(null)
  const MAX_AUTO_RETRIES = 3
  const RETRY_BASE_DELAY_MS = 2000

  // ---- Schema 增量编辑状态 ----
  /** Schema 历史栈，用于撤销操作 */
  const schemaHistory = ref<Widget[][]>([])
  /** 最近一次增量更新的 diff */
  const currentDiff = ref<SchemaDiff | null>(null)
  /** 最近一次增量更新的 diff (flow) */
  const currentFlowDiff = ref<FlowDiff | null>(null)
  /** 最近一次增量更新的描述 */
  const schemaUpdateDescription = ref<string | null>(null)

  // ---- 版本历史状态 ----
  const versionHistory = ref<VersionEntry[]>([])
  const currentVersionIndex = ref<number>(-1)

  // ---- 流式 Schema 生成状态 ----
  /** 当前构建步骤 */
  const currentBuildStep = ref<string | null>(null)

  // ---- LLM Provider 状态 ----
  const llmProviders = ref<LLMProviderInfo[]>([])
  const llmDefaultProvider = ref<string>('deepseek')
  const llmDefaultStrategy = ref<string | null>(null)
  const llmStrategies = ref<string[]>([])
  const llmUsage = ref<LLMAggregatedUsage | null>(null)
  const llmLoading = ref(false)

  // ---- RAG 状态 ----
  const ragSearchResults = ref<RagSearchResult[]>([])
  const ragSearching = ref(false)
  /** 用户选中的 RAG context，发送消息时携带 */
  const ragContext = ref<RagSearchResult[]>([])

  // ---- HITL Interrupt 状态 ----
  const pendingInterrupt = ref<PendingInterrupt | null>(null)

  // ---- Chat Settings ----
  const CHAT_SETTINGS_KEY = 'ai-chat-settings'

  const DEFAULT_CHAT_SETTINGS: ChatSettings = {
    preferences: {
      replyLanguage: 'zh-CN',
      replyStyle: 'detailed',
      codeComment: 'yes',
    },
    historySummary: {
      mode: 'auto',
    },
  }

  const chatSettings = ref<ChatSettings>(loadChatSettings())

  // ---- Getters ----

  const currentConversation = computed(() =>
    conversations.value.find((c) => c.id === currentConversationId.value) ?? null,
  )

  const hasPreview = computed(() =>
    currentSchema.value !== null || currentFlow.value !== null,
  )

  const canUndoSchema = computed(() => schemaHistory.value.length > 0)

  // ---- Actions ----

  /**
   * 可取消的延迟，abort 时立即 resolve。
   */
  function cancellableDelay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve) => {
      if (signal.aborted) { resolve(); return }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort)
        resolve()
      }, ms)
      function onAbort() {
        clearTimeout(timer)
        resolve()
      }
      signal.addEventListener('abort', onAbort, { once: true })
    })
  }

  /**
   * 核心 SSE 流执行逻辑，支持自动重试。
   * 在指定的 assistantIndex 上写入内容，不创建新消息占位。
   */
  async function _executeStream(
    content: string,
    mentions: MentionReference[] | undefined,
    assistantIndex: number,
  ): Promise<void> {
    let attempts = 0

    while (attempts <= MAX_AUTO_RETRIES) {
      // 每次尝试创建独立的 AbortController
      const localController = new AbortController()
      abortController.value = localController
      const { signal } = localController

      sseStatus.value = attempts === 0 ? 'connecting' : 'reconnecting'
      retryCount.value = attempts

      try {
        const stream = chat({
          conversationId: currentConversationId.value ?? undefined,
          message: content,
          context: {
            ...context.value,
            preferences: {
              ...context.value.preferences,
              replyLanguage: chatSettings.value.preferences.replyLanguage,
              replyStyle: chatSettings.value.preferences.replyStyle,
              codeComment: chatSettings.value.preferences.codeComment,
            },
            historySummary: chatSettings.value.historySummary.mode === 'manual'
              ? chatSettings.value.historySummary.manualSummary
              : context.value.historySummary,
          },
          mentions: mentions && mentions.length > 0 ? mentions : undefined,
        }, signal)

        const reader = stream.getReader()
        let doneEventReceived = false
        let firstChunkReceived = false

        while (true) {
          if (signal.aborted) {
            reader.cancel()
            break
          }

          const { done, value } = await reader.read()
          if (done) break

          if (!firstChunkReceived) {
            firstChunkReceived = true
            sseStatus.value = 'connected'
          }

          const event = value as SSEEvent
          if (event.type === 'done') {
            doneEventReceived = true
          }
          handleSSEEvent(event, assistantIndex)
        }

        sseStatus.value = 'idle'

        if (!doneEventReceived && !signal.aborted) {
          if (currentConversationId.value) {
            loadConversations()
          }
        }

        // 成功，跳出重试循环
        break
      } catch (err) {
        if (signal.aborted) {
          // 用户主动取消（stop 或新消息覆盖）
          messages.value[assistantIndex].content += '\n\n[已停止]'
          messages.value[assistantIndex].status = 'received'
          sseStatus.value = 'idle'
          break
        }

        attempts++

        if (attempts <= MAX_AUTO_RETRIES) {
          // 自动重试
          sseStatus.value = 'reconnecting'
          retryCount.value = attempts
          messages.value[assistantIndex].content = `连接中断，正在重连 (${attempts}/${MAX_AUTO_RETRIES})...`
          messages.value[assistantIndex].status = 'streaming'

          await cancellableDelay(RETRY_BASE_DELAY_MS * attempts, signal)

          // 延迟后再次检查是否被取消
          if (signal.aborted) {
            messages.value[assistantIndex].content += '\n\n[已停止]'
            messages.value[assistantIndex].status = 'received'
            sseStatus.value = 'idle'
            break
          }

          // 重置 assistant 消息内容，准备下一次尝试
          messages.value[assistantIndex].content = ''
          error.value = null
        } else {
          // 超过最大重试次数
          const msg = err instanceof Error ? err.message : 'Unknown error'
          sseStatus.value = 'disconnected'
          error.value = msg
          messages.value[assistantIndex].content = `Error: ${msg}`
          messages.value[assistantIndex].status = 'error'
        }
      }
    }

    // 最终清理
    loading.value = false
    if (messages.value[assistantIndex].status === 'streaming') {
      messages.value[assistantIndex].status = 'received'
    }
    abortController.value = null
  }

  /**
   * 发送用户消息，订阅 SSE 流，逐步更新 messages 和生成物。
   */
  async function sendMessage(content: string, mentions?: MentionReference[]): Promise<void> {
    // 取消正在进行的请求
    if (abortController.value) {
      abortController.value.abort()
    }

    lastMessagePayload.value = { content, mentions }
    retryCount.value = 0
    loading.value = true
    error.value = null

    // 将 RAG context 注入消息内容
    let enrichedContent = content
    if (ragContext.value.length > 0) {
      const ragBlock = ragContext.value
        .map((r) => `[引用 Schema: ${r.name}] (相似度 ${r.score}%, 组件: ${r.widgetTypes.join(', ')})`)
        .join('\n')
      enrichedContent = `[RAG 上下文]\n${ragBlock}\n\n${content}`
      // 发送后清除 RAG context
      ragContext.value = []
    }

    // 追加用户消息
    messages.value.push({
      role: 'user',
      content: enrichedContent,
      timestamp: new Date(),
      status: 'sent',
    })

    // 准备 assistant 消息占位
    const assistantIndex = messages.value.length
    messages.value.push({
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'streaming',
    })

    await _executeStream(enrichedContent, mentions, assistantIndex)
  }

  /**
   * 重试最近一次失败的消息。
   * 复用最后一条 assistant 消息的位置。
   */
  async function retryLastMessage(): Promise<void> {
    if (!lastMessagePayload.value) return

    // 取消正在进行的请求
    if (abortController.value) {
      abortController.value.abort()
    }

    retryCount.value = 0
    loading.value = true
    error.value = null

    // 找到最后一条 assistant 消息并重置
    const lastIdx = messages.value.length - 1
    if (lastIdx >= 0 && messages.value[lastIdx].role === 'assistant') {
      messages.value[lastIdx].content = ''
      messages.value[lastIdx].status = 'streaming'
      await _executeStream(lastMessagePayload.value.content, lastMessagePayload.value.mentions, lastIdx)
    }
  }

  /**
   * 停止当前请求
   */
  function stopGeneration(): void {
    if (abortController.value) {
      abortController.value.abort()
    }
    retryCount.value = 0
    lastMessagePayload.value = null
  }

  function handleSSEEvent(event: SSEEvent, assistantIndex: number): void {
    const msg = messages.value[assistantIndex]

    switch (event.type) {
      case 'agent_switch':
        if (event.agent) {
          msg.agent = event.agent as 'editor' | 'flow' | 'general'

          // 协作事件：显示协作提示
          if (event.collaboration && event.description) {
            // 在 thinking 中添加协作说明
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
          // Push current schema to history before overwriting (for undo)
          if (currentSchema.value) {
            schemaHistory.value.push(JSON.parse(JSON.stringify(currentSchema.value)))
          }
          currentSchema.value = event.payload as Widget[]
          msg.schema = event.payload as Widget[]
        }
        if (event.description) {
          msg.content = (msg.content ?? '') + event.description
        }
        break

      case 'schema_diff':
        if (event.diff) {
          currentDiff.value = event.diff as SchemaDiff
          schemaUpdateDescription.value = event.description ?? null
        }
        break

      case 'flow_diff':
        if (event.diff) {
          currentFlowDiff.value = event.diff as FlowDiff
        }
        break

      case 'version_created':
        if (event.versionId && event.version) {
          versionHistory.value.unshift({
            id: event.versionId,
            version: event.version,
            type: currentSchema.value ? 'schema' : 'flow',
            description: event.description,
            createdAt: new Date().toISOString(),
          })
          currentVersionIndex.value = 0
        }
        break

      case 'schema_update':
        // 流式 Schema 更新：设置当前构建步骤
        if (event.step) {
          currentBuildStep.value = event.step
        }
        if (event.schema) {
          currentSchema.value = event.schema as Widget[]
        }
        // 在 thinking 中显示进度
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
        // Schema 生成完成
        currentBuildStep.value = null
        if (event.schema) {
          currentSchema.value = event.schema as Widget[]
          msg.schema = event.schema as Widget[]
        }
        if (event.description) {
          msg.content = (msg.content ?? '') + event.description
        }
        break

      case 'flow':
        if (event.payload) {
          currentFlow.value = event.payload as FlowGraph
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
        // S4: Match by ID instead of name for precise result association
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

      // S5: Update existing tool call entry with error info instead of creating a new one
      case 'tool_error': {
        if (!msg.toolCalls) msg.toolCalls = []
        const errorMsg = event.content ?? '工具执行失败'
        // Find existing entry by runId (S4) or by name as fallback
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
          currentConversationId.value = event.conversationId
          // 新对话创建后刷新左侧列表
          loadConversations()
        }
        break

      case 'interrupt': {
        // HITL 确认：写操作需要用户确认
        const interruptData: PendingInterrupt = {
          threadId: event.threadId ?? '',
          type: event.interruptType ?? 'unknown',
          message: event.message ?? '需要您的确认',
          data: event.data,
        }
        pendingInterrupt.value = interruptData
        messages.value.push({
          role: 'assistant',
          type: 'interrupt',
          content: interruptData.message,
          data: interruptData,
          timestamp: new Date(),
          status: 'received',
        })
        break
      }

      case 'error':
        error.value = event.content ?? 'Unknown error'
        // 将错误信息写入消息内容，让用户明确看到失败原因
        if (msg.status === 'streaming') {
          const agentLabel = event.agent ? ` [${event.agent}]` : ''
          msg.content = (msg.content || msg.thinking || '')
            + `\n\n⚠️${agentLabel} ${event.content ?? '未知错误'}`
          msg.status = 'error'
        }
        break
    }
  }

  function switchAgent(agent: AgentType): void {
    activeAgent.value = agent
    // 'auto' 对应后端 standalone 模式，由 Router Agent 自动分发
    context.value.source = agent === 'auto' ? 'standalone' : (agent as 'editor' | 'flow')
  }

  // ---- RAG Actions ----

  async function searchRagAction(query: string, limit?: number): Promise<void> {
    if (!query.trim()) {
      ragSearchResults.value = []
      return
    }
    ragSearching.value = true
    try {
      const result = await searchRag({ query: query.trim(), limit: limit ?? 5 })
      ragSearchResults.value = result.schemas
    } catch (err) {
      ragSearchResults.value = []
      throw err
    } finally {
      ragSearching.value = false
    }
  }

  function addRagContext(item: RagSearchResult): void {
    if (!ragContext.value.find((c) => c.id === item.id)) {
      ragContext.value.push(item)
    }
  }

  function removeRagContext(id: string): void {
    ragContext.value = ragContext.value.filter((c) => c.id !== id)
  }

  function clearRagContext(): void {
    ragContext.value = []
    ragSearchResults.value = []
  }

  // ---- HITL Interrupt Actions ----

  /** 清除 pending interrupt 状态 */
  function clearInterrupt(): void {
    pendingInterrupt.value = null
  }

  /**
   * 响应 HITL interrupt：确认或拒绝。
   * 发送 resume 请求，订阅返回的 SSE 流继续对话。
   */
  async function respondInterrupt(confirmed: boolean): Promise<void> {
    const interrupt = pendingInterrupt.value
    if (!interrupt) return

    loading.value = true
    error.value = null
    pendingInterrupt.value = null

    // 准备 assistant 消息占位，承接 resume 后的流式输出
    const assistantIndex = messages.value.length
    messages.value.push({
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'streaming',
    })

    // 复用 _executeStream 的模式，但用 resumeInterrupt 流
    const localController = new AbortController()
    abortController.value = localController
    const { signal } = localController

    sseStatus.value = 'connecting'

    try {
      const stream = resumeInterrupt(interrupt.threadId, confirmed, signal)
      const reader = stream.getReader()
      let doneEventReceived = false

      while (true) {
        if (signal.aborted) {
          reader.cancel()
          break
        }

        const { done, value } = await reader.read()
        if (done) break

        sseStatus.value = 'connected'
        const event = value as SSEEvent
        if (event.type === 'done') doneEventReceived = true
        handleSSEEvent(event, assistantIndex)
      }

      sseStatus.value = 'idle'

      if (!doneEventReceived && !signal.aborted) {
        if (currentConversationId.value) loadConversations()
      }
    } catch (err) {
      if (signal.aborted) {
        messages.value[assistantIndex].content += '\n\n[已停止]'
        messages.value[assistantIndex].status = 'received'
        sseStatus.value = 'idle'
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        sseStatus.value = 'disconnected'
        error.value = msg
        messages.value[assistantIndex].content = `Error: ${msg}`
        messages.value[assistantIndex].status = 'error'
      }
    } finally {
      loading.value = false
      if (messages.value[assistantIndex].status === 'streaming') {
        messages.value[assistantIndex].status = 'received'
      }
      abortController.value = null
    }
  }

  function loadChatSettings(): ChatSettings {
    try {
      const stored = localStorage.getItem(CHAT_SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ChatSettings
        return {
          preferences: { ...DEFAULT_CHAT_SETTINGS.preferences, ...parsed.preferences },
          historySummary: { ...DEFAULT_CHAT_SETTINGS.historySummary, ...parsed.historySummary },
        }
      }
    } catch {
      // localStorage 不可用或数据损坏，使用默认值
    }
    return { ...DEFAULT_CHAT_SETTINGS }
  }

  function updateChatSettings(settings: {
    preferences?: Partial<ChatSettings['preferences']>
    historySummary?: Partial<ChatSettings['historySummary']>
  }): void {
    chatSettings.value = {
      preferences: { ...chatSettings.value.preferences, ...settings.preferences },
      historySummary: { ...chatSettings.value.historySummary, ...settings.historySummary },
    }
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(chatSettings.value))
  }

  function clearConversation(): void {
    // 取消正在进行的请求
    if (abortController.value) {
      abortController.value.abort()
    }

    currentConversationId.value = null
    messages.value = []
    currentSchema.value = null
    currentFlow.value = null
    error.value = null
    taskChain.value = []
    taskChainIndex.value = 0
    schemaHistory.value = []
    currentDiff.value = null
    currentFlowDiff.value = null
    schemaUpdateDescription.value = null
    versionHistory.value = []
    currentVersionIndex.value = -1

    // 重置 RAG 状态
    ragSearchResults.value = []
    ragContext.value = []

    // 重置 HITL 状态
    pendingInterrupt.value = null

    // 重置 SSE 状态
    sseStatus.value = 'idle'
    retryCount.value = 0
    lastMessagePayload.value = null
  }

  /**
   * 撤销最近一次 Schema 增量更新。
   * 从历史栈中弹出上一个 Schema 状态。
   */
  function undoLastSchemaUpdate(): void {
    if (schemaHistory.value.length === 0) return
    const previousSchema = schemaHistory.value.pop()
    if (previousSchema) {
      currentSchema.value = previousSchema
      currentDiff.value = null
      schemaUpdateDescription.value = null
    }
  }

  /**
   * 清除当前 diff 显示状态。
   */
  function clearDiff(): void {
    currentDiff.value = null
    currentFlowDiff.value = null
    schemaUpdateDescription.value = null
  }

  async function loadConversations(): Promise<void> {
    conversations.value = await getConversations()
  }

  async function removeConversation(id: string): Promise<void> {
    await deleteConversation(id)
    conversations.value = conversations.value.filter((c) => c.id !== id)
    if (currentConversationId.value === id) {
      clearConversation()
    }
  }

  async function loadConversation(id: string): Promise<void> {
    // 重置当前对话状态，防止加载前一个对话的残留数据（diff、版本历史等）
    clearConversation()

    const detail = await getConversationDetail(id)
    currentConversationId.value = detail.id
    messages.value = detail.messages.map((m) => ({
      role: m.role as AIMessage['role'],
      content: m.content,
      thinking: (m as Record<string, unknown>).thinking as string | undefined,
      tip: (m as Record<string, unknown>).tip as string | undefined,
      toolCalls: (m as Record<string, unknown>).toolCalls as AIMessage['toolCalls'],
      schema: m.schema as Widget[] | undefined,
      flow: m.flow as FlowGraph | undefined,
      timestamp: new Date(m.timestamp),
    }))
    // Restore preview state from last assistant message
    const lastAssistant = [...detail.messages].reverse().find((m) => m.role === 'assistant')
    if (lastAssistant?.schema) {
      currentSchema.value = lastAssistant.schema as Widget[]
    }
    if (lastAssistant?.flow) {
      currentFlow.value = lastAssistant.flow as FlowGraph
    }
    error.value = null
  }

  async function publishCurrent(): Promise<string | null> {
    if (!currentConversationId.value) return null

    const type = currentSchema.value ? 'schema' : 'flow'
    const payload = currentSchema.value ?? currentFlow.value
    if (!payload) return null

    const result = await publish({
      conversationId: currentConversationId.value,
      type,
      payload,
    })

    return result.publishId ?? result.id
  }

  function setContext(ctx: Partial<ChatContext>): void {
    context.value = { ...context.value, ...ctx }
  }

  function setCurrentSchema(schema: Widget[] | null): void {
    currentSchema.value = schema
  }

  function setCurrentFlow(flow: FlowGraph | null): void {
    currentFlow.value = flow
  }

  // ---- 版本管理 ----

  /**
   * 加载当前对话的版本历史列表。
   */
  async function loadVersionHistory(): Promise<void> {
    if (!currentConversationId.value) return
    const data = await getVersions(currentConversationId.value)
    versionHistory.value = data.map((v: { id: string; version: number; type: string; description?: string; createdAt: string }) => ({
      id: v.id,
      version: v.version,
      type: v.type as 'schema' | 'flow',
      description: v.description,
      createdAt: v.createdAt,
    }))
    if (versionHistory.value.length > 0) {
      currentVersionIndex.value = 0
    }
  }

  /**
   * 回滚到指定版本。
   */
  async function rollbackToVersion(versionId: string): Promise<void> {
    if (!currentConversationId.value) return
    const result = await rollbackVersion(currentConversationId.value, versionId)
    if (result.type === 'schema' && result.content) {
      // Push current to history before rollback
      if (currentSchema.value) {
        schemaHistory.value.push(JSON.parse(JSON.stringify(currentSchema.value)))
      }
      currentSchema.value = result.content as unknown as Widget[]
      currentDiff.value = null
    } else if (result.type === 'flow' && result.content) {
      currentFlow.value = result.content as unknown as FlowGraph
      currentFlowDiff.value = null
    }
    // Reload version history
    await loadVersionHistory()
  }

  // ---- 对话搜索 ----

  /** 搜索对话列表 */
  async function searchConversationsAction(query: string): Promise<SearchResult> {
    return searchConversations({ keyword: query })
  }

  // ---- Mention 搜索 ----

  /** 搜索可引用的 Schema/Flow/Widget */
  async function mentionSearchAction(
    query: string,
    type: MentionType,
    limit = 10,
  ): Promise<MentionSearchResult[]> {
    return mentionSearch(query, type, limit)
  }

  // ---- LLM Provider 管理 ----

  async function loadLLMProviders(): Promise<void> {
    llmLoading.value = true
    try {
      const data = await getLLMProviders()
      llmProviders.value = data.providers
      llmDefaultProvider.value = data.default
      llmDefaultStrategy.value = data.defaultStrategy
    } finally {
      llmLoading.value = false
    }
  }

  async function loadLLMStrategies(): Promise<void> {
    const data = await getLLMStrategies()
    llmStrategies.value = data.strategies
    llmDefaultStrategy.value = data.default
  }

  async function loadLLMUsage(): Promise<void> {
    const data = await getLLMUsage()
    llmUsage.value = data as LLMAggregatedUsage
  }

  async function switchProvider(provider: string): Promise<void> {
    await switchLLMProvider(provider)
    llmDefaultProvider.value = provider
    // 更新 providers 列表中的 isDefault 标记
    llmProviders.value = llmProviders.value.map((p) => ({
      ...p,
      isDefault: p.name === provider,
    }))
  }

  async function switchStrategy(strategy: string | null): Promise<void> {
    await switchLLMStrategy(strategy)
    llmDefaultStrategy.value = strategy
  }

  return {
    // state
    conversations,
    currentConversationId,
    messages,
    activeAgent,
    context,
    loading,
    currentSchema,
    currentFlow,
    error,
    taskChain,
    taskChainIndex,
    schemaHistory,
    currentDiff,
    currentFlowDiff,
    schemaUpdateDescription,
    versionHistory,
    currentVersionIndex,
    sseStatus,
    retryCount,
    llmProviders,
    llmDefaultProvider,
    llmDefaultStrategy,
    llmStrategies,
    llmUsage,
    llmLoading,
    chatSettings,
    ragSearchResults,
    ragSearching,
    ragContext,
    pendingInterrupt,

    // getters
    currentConversation,
    hasPreview,
    canUndoSchema,

    // constants
    MAX_AUTO_RETRIES: computed(() => MAX_AUTO_RETRIES),

    // actions
    sendMessage,
    retryLastMessage,
    stopGeneration,
    switchAgent,
    clearConversation,
    loadConversations,
    loadConversation,
    removeConversation,
    publishCurrent,
    setContext,
    setCurrentSchema,
    setCurrentFlow,
    undoLastSchemaUpdate,
    clearDiff,
    loadVersionHistory,
    rollbackToVersion,
    loadLLMProviders,
    loadLLMStrategies,
    loadLLMUsage,
    switchProvider,
    switchStrategy,
    updateChatSettings,
    loadChatSettings,
    searchRagAction,
    addRagContext,
    removeRagContext,
    clearRagContext,
    searchConversationsAction,
    mentionSearchAction,
    clearInterrupt,
    respondInterrupt,
  }
})
