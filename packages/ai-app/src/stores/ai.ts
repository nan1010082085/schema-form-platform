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
  Conversation,
  Widget,
  FlowGraph,
  SSEEvent,
  TaskChainStep,
} from '@/types'
import { chat, getConversations, getConversationDetail, deleteConversation, publish } from '@/api/aiApi'

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

  // ---- Getters ----

  const currentConversation = computed(() =>
    conversations.value.find((c) => c.id === currentConversationId.value) ?? null,
  )

  const hasPreview = computed(() =>
    currentSchema.value !== null || currentFlow.value !== null,
  )

  // ---- Actions ----

  /**
   * 发送用户消息，订阅 SSE 流，逐步更新 messages 和生成物。
   */
  async function sendMessage(content: string): Promise<void> {
    // 创建新的 AbortController
    abortController.value = new AbortController()
    loading.value = true
    error.value = null

    // 追加用户消息
    messages.value.push({
      role: 'user',
      content,
      timestamp: new Date(),
    })

    // 准备 assistant 消息占位
    const assistantIndex = messages.value.length
    messages.value.push({
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    })

    try {
      const stream = chat({
        conversationId: currentConversationId.value ?? undefined,
        message: content,
        context: context.value,
      }, abortController.value?.signal)

      const reader = stream.getReader()
      let doneEventReceived = false

      while (true) {
        // 检查是否已取消
        if (abortController.value?.signal.aborted) {
          reader.cancel()
          break
        }

        const { done, value } = await reader.read()
        if (done) break

        const event = value as SSEEvent
        if (event.type === 'done') {
          doneEventReceived = true
        }
        handleSSEEvent(event, assistantIndex)
      }

      // 流结束但未收到 done 事件：手动触发完成逻辑
      if (!doneEventReceived && !abortController.value?.signal.aborted) {
        if (currentConversationId.value) {
          loadConversations()
        }
      }
    } catch (err) {
      // 如果是取消操作，不显示错误
      if (abortController.value?.signal.aborted) {
        messages.value[assistantIndex].content += '\n\n[已停止]'
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        error.value = msg
        messages.value[assistantIndex].content = `Error: ${msg}`
      }
    } finally {
      loading.value = false
      abortController.value = null
    }
  }

  /**
   * 停止当前请求
   */
  function stopGeneration(): void {
    if (abortController.value) {
      abortController.value.abort()
    }
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
          currentSchema.value = event.payload as Widget[]
          msg.schema = event.payload as Widget[]
        }
        if (event.description) {
          msg.content = event.description
        }
        break

      case 'flow':
        if (event.payload) {
          currentFlow.value = event.payload as FlowGraph
          msg.flow = event.payload as FlowGraph
        }
        if (event.description) {
          msg.content = event.description
        }
        break

      case 'tool_call':
        if (!msg.toolCalls) msg.toolCalls = []
        if (event.phase === 'calling' && event.tools) {
          for (const tool of event.tools) {
            msg.toolCalls.push({
              name: tool.name,
              arguments: tool.arguments ?? {},
            })
          }
        }
        if (event.phase === 'result' && event.tools) {
          for (const tool of event.tools) {
            const existing = msg.toolCalls.find((t) => t.name === tool.name && !t.result)
            if (existing) {
              existing.result = tool.result
            }
          }
        }
        break

      case 'tool_error':
        if (!msg.toolCalls) msg.toolCalls = []
        msg.toolCalls.push({
          name: event.toolName ?? 'unknown',
          arguments: {},
          result: { error: event.content ?? '工具执行失败' },
        })
        break

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

      case 'error':
        error.value = event.content ?? 'Unknown error'
        break
    }
  }

  function switchAgent(agent: AgentType): void {
    activeAgent.value = agent
    // 'auto' 对应后端 standalone 模式，由 Router Agent 自动分发
    context.value.source = agent === 'auto' ? 'standalone' : (agent as 'editor' | 'flow')
  }

  function clearConversation(): void {
    currentConversationId.value = null
    messages.value = []
    currentSchema.value = null
    currentFlow.value = null
    error.value = null
    taskChain.value = []
    taskChainIndex.value = 0
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

    // getters
    currentConversation,
    hasPreview,

    // actions
    sendMessage,
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
  }
})
