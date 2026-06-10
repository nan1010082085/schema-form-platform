/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAiStore } from '@/stores/ai'

// Mock the API module
vi.mock('@/api/aiApi', () => ({
  chat: vi.fn(),
  getConversations: vi.fn(),
  deleteConversation: vi.fn(),
  publish: vi.fn(),
}))

import { chat, getConversations, deleteConversation, publish } from '@/api/aiApi'

function mockSSEStream(events: Array<Record<string, unknown>>) {
  let index = 0
  return new ReadableStream({
    pull(controller) {
      if (index < events.length) {
        controller.enqueue(events[index])
        index++
      } else {
        controller.close()
      }
    },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useAiStore', () => {
  it('initializes with default state', () => {
    const store = useAiStore()
    expect(store.messages).toEqual([])
    expect(store.conversations).toEqual([])
    expect(store.currentConversationId).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.currentSchema).toBeNull()
    expect(store.currentFlow).toBeNull()
    expect(store.activeAgent).toBe('auto')
  })

  describe('sendMessage', () => {
    it('appends user and assistant messages', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: '你好' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('hello')

      expect(store.messages).toHaveLength(2)
      expect(store.messages[0]).toMatchObject({ role: 'user', content: 'hello' })
      expect(store.messages[1]).toMatchObject({ role: 'assistant', content: '你好' })
      expect(store.currentConversationId).toBe('conv-1')
    })

    it('handles schema event', async () => {
      const store = useAiStore()
      const schema = [{ id: '1', type: 'input', field: 'name' }]
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'schema', payload: schema, description: '表单已生成' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('生成表单')

      expect(store.currentSchema).toEqual(schema)
      expect(store.messages[1].schema).toEqual(schema)
      expect(store.messages[1].content).toBe('表单已生成')
    })

    it('handles flow event', async () => {
      const store = useAiStore()
      const flow = { nodes: [{ id: 'n1', type: 'start', label: '开始' }], edges: [] }
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'flow', payload: flow, description: '流程已生成' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('生成流程')

      expect(store.currentFlow).toEqual(flow)
      expect(store.messages[1].flow).toEqual(flow)
    })

    it('handles error event', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'error', content: 'LLM 调用失败' },
      ]))

      await store.sendMessage('test')

      expect(store.error).toBe('LLM 调用失败')
      expect(store.loading).toBe(false)
    })

    it('handles stream read error', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockImplementation(() => new ReadableStream({
        start(controller) {
          controller.error(new Error('Network error'))
        },
      }))

      await store.sendMessage('test')

      expect(store.error).toBe('Network error')
      expect(store.messages[1].content).toContain('Error')
      expect(store.loading).toBe(false)
    }, 20000)

    it('sets text content from text event', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: '你好' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('hi')

      expect(store.messages[1].content).toBe('你好')
    })

    it('sets loading state during request', async () => {
      const store = useAiStore()
      let resolveStream: () => void
      const blockingStream = new ReadableStream({
        start(controller) {
          resolveStream = () => {
            controller.enqueue({ type: 'done', conversationId: 'c1' })
            controller.close()
          }
        },
      })
      vi.mocked(chat).mockReturnValue(blockingStream)

      const promise = store.sendMessage('test')
      expect(store.loading).toBe(true)

      resolveStream!()
      await promise
      expect(store.loading).toBe(false)
    })

    it('passes conversationId on subsequent messages', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: 'ok' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('first')

      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: 'sure' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('second')

      expect(chat).toHaveBeenLastCalledWith(
        expect.objectContaining({ conversationId: 'conv-1' }),
        expect.any(AbortSignal),
      )
    })
  })

  describe('switchAgent', () => {
    it('updates activeAgent and context.source', () => {
      const store = useAiStore()
      store.switchAgent('flow')
      expect(store.activeAgent).toBe('flow')
      expect(store.context.source).toBe('flow')
    })
  })

  describe('clearConversation', () => {
    it('resets conversation state', () => {
      const store = useAiStore()
      store.messages = [{ role: 'user', content: 'hi', timestamp: new Date() }]
      store.currentConversationId = 'conv-1'
      store.currentSchema = [{ id: '1' }] as any
      store.error = 'some error'

      store.clearConversation()

      expect(store.messages).toEqual([])
      expect(store.currentConversationId).toBeNull()
      expect(store.currentSchema).toBeNull()
      expect(store.currentFlow).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('loadConversations', () => {
    it('fetches and stores conversations', async () => {
      const store = useAiStore()
      const convos = [
        { id: '1', title: 'test', source: 'standalone', activeAgent: 'editor', createdAt: '', updatedAt: '' },
      ]
      vi.mocked(getConversations).mockResolvedValue(convos as any)

      await store.loadConversations()

      expect(store.conversations).toEqual(convos)
    })
  })

  describe('removeConversation', () => {
    it('deletes and removes from list', async () => {
      const store = useAiStore()
      store.conversations = [
        { id: '1', title: 'a', source: 'standalone', activeAgent: 'editor', createdAt: '', updatedAt: '' },
        { id: '2', title: 'b', source: 'standalone', activeAgent: 'editor', createdAt: '', updatedAt: '' },
      ]
      store.currentConversationId = '1'
      vi.mocked(deleteConversation).mockResolvedValue(undefined)

      await store.removeConversation('1')

      expect(store.conversations).toHaveLength(1)
      expect(store.conversations[0].id).toBe('2')
      expect(store.currentConversationId).toBeNull()
    })
  })

  describe('publishCurrent', () => {
    it('returns null when no current conversation', async () => {
      const store = useAiStore()
      const result = await store.publishCurrent()
      expect(result).toBeNull()
    })

    it('returns null when no schema or flow', async () => {
      const store = useAiStore()
      store.currentConversationId = 'conv-1'
      const result = await store.publishCurrent()
      expect(result).toBeNull()
    })

    it('publishes schema and returns id/publishId/type', async () => {
      const store = useAiStore()
      store.currentConversationId = 'conv-1'
      store.currentSchema = [{ id: '1', type: 'input' }] as any
      vi.mocked(publish).mockResolvedValue({ id: 's1', publishId: 'p1' })

      const result = await store.publishCurrent()

      expect(result).toEqual({ id: 's1', publishId: 'p1', type: 'schema' })
      expect(publish).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        type: 'schema',
        payload: store.currentSchema,
      })
    })

    it('publishes flow when no schema', async () => {
      const store = useAiStore()
      store.currentConversationId = 'conv-1'
      store.currentFlow = { nodes: [], edges: [] } as any
      vi.mocked(publish).mockResolvedValue({ id: 'f1', publishId: 'p2' })

      const result = await store.publishCurrent()

      expect(result).toEqual({ id: 'f1', publishId: 'p2', type: 'flow' })
      expect(publish).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        type: 'flow',
        payload: store.currentFlow,
      })
    })
  })

  describe('setContext', () => {
    it('merges context fields', () => {
      const store = useAiStore()
      store.setContext({ source: 'editor', schemaId: 's1' })
      expect(store.context.source).toBe('editor')
      expect(store.context.schemaId).toBe('s1')

      store.setContext({ flowId: 'f1' })
      expect(store.context.source).toBe('editor')
      expect(store.context.flowId).toBe('f1')
    })

    it('sets preferences', () => {
      const store = useAiStore()
      const prefs = { layoutStyle: 'grid', labelWidth: 120, theme: 'dark' }
      store.setContext({ preferences: prefs })
      expect(store.context.preferences).toEqual(prefs)
    })

    it('sets historySummary', () => {
      const store = useAiStore()
      store.setContext({ historySummary: '用户之前讨论了表单布局和字段配置' })
      expect(store.context.historySummary).toBe('用户之前讨论了表单布局和字段配置')
    })

    it('preserves preferences and historySummary when merging other fields', () => {
      const store = useAiStore()
      store.setContext({
        source: 'editor',
        preferences: { labelWidth: 100 },
        historySummary: '之前的对话摘要',
      })
      store.setContext({ schemaId: 's1' })
      expect(store.context.preferences).toEqual({ labelWidth: 100 })
      expect(store.context.historySummary).toBe('之前的对话摘要')
      expect(store.context.schemaId).toBe('s1')
    })

    it('sets selectedWidget', () => {
      const store = useAiStore()
      store.setContext({
        selectedWidget: { id: 'w1', type: 'input', field: 'name', label: 'Name' },
      })
      expect(store.context.selectedWidget).toEqual({ id: 'w1', type: 'input', field: 'name', label: 'Name' })
    })

    it('sets editorMode', () => {
      const store = useAiStore()
      store.setContext({ editorMode: 'edit' })
      expect(store.context.editorMode).toBe('edit')
    })

    it('preserves selectedWidget and editorMode when merging other fields', () => {
      const store = useAiStore()
      store.setContext({
        source: 'editor',
        selectedWidget: { id: 'w1', type: 'input' },
        editorMode: 'edit',
      })
      store.setContext({ schemaId: 's1' })
      expect(store.context.selectedWidget).toEqual({ id: 'w1', type: 'input' })
      expect(store.context.editorMode).toBe('edit')
      expect(store.context.schemaId).toBe('s1')
    })
  })

  describe('S8-10: preferences and historySummary in sendMessage', () => {
    it('passes preferences and historySummary to chat API', async () => {
      const store = useAiStore()
      store.setContext({
        source: 'editor',
        preferences: { layoutStyle: 'grid', labelWidth: 120 },
        historySummary: '用户讨论了注册表单设计',
      })

      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: 'ok' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('继续修改')

      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            source: 'editor',
            preferences: expect.objectContaining({
              layoutStyle: 'grid',
              labelWidth: 120,
              replyLanguage: 'zh-CN',
              replyStyle: 'detailed',
              codeComment: 'yes',
            }),
            historySummary: '用户讨论了注册表单设计',
          }),
        }),
        expect.any(AbortSignal),
      )
    })
  })

  describe('selectedWidget and editorMode in sendMessage', () => {
    it('passes selectedWidget and editorMode to chat API', async () => {
      const store = useAiStore()
      store.setContext({
        source: 'editor',
        selectedWidget: { id: 'w1', type: 'input', field: 'name', label: 'Name' },
        editorMode: 'edit',
      })

      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: 'ok' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('修改选中的组件')

      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            source: 'editor',
            selectedWidget: { id: 'w1', type: 'input', field: 'name', label: 'Name' },
            editorMode: 'edit',
          }),
        }),
        expect.any(AbortSignal),
      )
    })
  })

  describe('chatSettings', () => {
    it('initializes with default settings', () => {
      const store = useAiStore()
      expect(store.chatSettings).toEqual({
        preferences: {
          replyLanguage: 'zh-CN',
          replyStyle: 'detailed',
          codeComment: 'yes',
        },
        historySummary: { mode: 'auto' },
      })
    })

    it('updateChatSettings merges preferences', () => {
      const store = useAiStore()
      store.updateChatSettings({
        preferences: { replyLanguage: 'en-US', replyStyle: 'concise' },
      })
      expect(store.chatSettings.preferences.replyLanguage).toBe('en-US')
      expect(store.chatSettings.preferences.replyStyle).toBe('concise')
      // codeComment should remain unchanged
      expect(store.chatSettings.preferences.codeComment).toBe('yes')
    })

    it('updateChatSettings merges historySummary', () => {
      const store = useAiStore()
      store.updateChatSettings({
        historySummary: { mode: 'manual', manualSummary: 'test' },
      })
      expect(store.chatSettings.historySummary.mode).toBe('manual')
      expect(store.chatSettings.historySummary.manualSummary).toBe('test')
    })

    it('passes chatSettings preferences to chat API', async () => {
      const store = useAiStore()
      store.updateChatSettings({
        preferences: { replyLanguage: 'en-US' as const, replyStyle: 'concise' as const, codeComment: 'no' as const },
      })

      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: 'ok' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('test')

      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            preferences: expect.objectContaining({
              replyLanguage: 'en-US',
              replyStyle: 'concise',
              codeComment: 'no',
            }),
          }),
        }),
        expect.any(AbortSignal),
      )
    })
  })

  describe('hasPreview', () => {
    it('returns false when no preview', () => {
      const store = useAiStore()
      expect(store.hasPreview).toBe(false)
    })

    it('returns true when schema exists', () => {
      const store = useAiStore()
      store.currentSchema = [{ id: '1' }] as any
      expect(store.hasPreview).toBe(true)
    })

    it('returns true when flow exists', () => {
      const store = useAiStore()
      store.currentFlow = { nodes: [], edges: [] } as any
      expect(store.hasPreview).toBe(true)
    })
  })

  // ---- F5: 流结束处理优化 ----

  describe('F5: stream end without done event', () => {
    it('refreshes conversation list when stream ends without done event', async () => {
      const store = useAiStore()
      // 先设置一个已存在的 conversationId（模拟已有对话）
      store.currentConversationId = 'conv-existing'

      const convos = [
        { id: 'conv-existing', title: 'test', source: 'standalone', activeAgent: 'editor', createdAt: '', updatedAt: '' },
      ]
      vi.mocked(getConversations).mockResolvedValue(convos as any)

      // 流只包含 text 事件，没有 done 事件
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: '回复内容' },
      ]))

      await store.sendMessage('hello')

      expect(store.messages[1].content).toBe('回复内容')
      expect(store.loading).toBe(false)
      // 关键验证：loadConversations 被调用
      expect(getConversations).toHaveBeenCalled()
      expect(store.conversations).toEqual(convos)
    })

    it('skips conversation refresh when stream was aborted', async () => {
      const store = useAiStore()
      store.currentConversationId = 'conv-1'

      let resolveStream: () => void
      const blockingStream = new ReadableStream({
        start(controller) {
          resolveStream = () => {
            controller.enqueue({ type: 'text', content: 'partial' })
            controller.close()
          }
        },
      })
      vi.mocked(chat).mockReturnValue(blockingStream)

      const promise = store.sendMessage('test')
      // 在流结束前取消
      store.stopGeneration()
      resolveStream!()
      await promise

      // 取消后不应刷新列表
      expect(getConversations).not.toHaveBeenCalled()
    })

    it('skips conversation refresh for new conversation without done event', async () => {
      const store = useAiStore()
      // currentConversationId 为 null（新对话）
      expect(store.currentConversationId).toBeNull()

      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: 'hi' },
      ]))

      await store.sendMessage('hello')

      // 新对话没有 conversationId，不应调用 loadConversations
      expect(getConversations).not.toHaveBeenCalled()
      expect(store.loading).toBe(false)
    })
  })

  // ---- F6: tool_error 事件处理 ----

  describe('F6: tool_error event', () => {
    it('creates tool call entry with error info', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_error', content: '数据库连接超时', toolName: 'save_widget' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('保存组件')

      const assistant = store.messages[1]
      expect(assistant.toolCalls).toHaveLength(1)
      expect(assistant.toolCalls![0]).toMatchObject({
        name: 'save_widget',
        arguments: {},
        result: { error: '数据库连接超时' },
      })
    })

    it('uses default tool name when not provided', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_error', content: '执行失败' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('test')

      const assistant = store.messages[1]
      expect(assistant.toolCalls).toHaveLength(1)
      expect(assistant.toolCalls![0].name).toBe('unknown')
      expect(assistant.toolCalls![0].result).toEqual({ error: '执行失败' })
    })

    it('uses default error message when content is missing', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_error', toolName: 'gen_schema' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('test')

      const assistant = store.messages[1]
      expect(assistant.toolCalls![0].result).toEqual({ error: '工具执行失败' })
    })

    it('appends to existing tool calls', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_call', phase: 'calling', tools: [{ id: '1', name: 'get_widgets', arguments: {} }] },
        { type: 'tool_call', phase: 'result', tools: [{ id: '1', name: 'get_widgets', result: { data: [] } }] },
        { type: 'tool_error', content: '保存失败', toolName: 'save_widget' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('test')

      const assistant = store.messages[1]
      expect(assistant.toolCalls).toHaveLength(2)
      expect(assistant.toolCalls![0].name).toBe('get_widgets')
      expect(assistant.toolCalls![0].result).toEqual({ data: [] })
      expect(assistant.toolCalls![1].name).toBe('save_widget')
      expect(assistant.toolCalls![1].result).toEqual({ error: '保存失败' })
    })

    it('matches tool_error by runId to existing calling entry', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_call', phase: 'calling', tools: [{ id: 'run-abc', name: 'generate_schema', arguments: { prompt: 'test' } }] },
        { type: 'tool_error', toolName: 'generate_schema', runId: 'run-abc', content: 'Schema 校验失败' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('test')

      const assistant = store.messages[1]
      expect(assistant.toolCalls).toHaveLength(1)
      expect(assistant.toolCalls![0]).toMatchObject({
        id: 'run-abc',
        name: 'generate_schema',
        arguments: { prompt: 'test' },
        error: 'Schema 校验失败',
        result: { error: 'Schema 校验失败' },
      })
    })

    it('creates new entry when tool_error matches name but existing entry already has result (no runId)', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_call', phase: 'calling', tools: [{ id: '1', name: 'search_schemas', arguments: {} }] },
        { type: 'tool_call', phase: 'result', tools: [{ id: '1', name: 'search_schemas', result: { data: [] } }] },
        { type: 'tool_error', content: '后续操作失败', toolName: 'search_schemas' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('test')

      const assistant = store.messages[1]
      // Existing successful entry is preserved, new error entry is appended
      expect(assistant.toolCalls).toHaveLength(2)
      expect(assistant.toolCalls![0].result).toEqual({ data: [] })
      expect(assistant.toolCalls![0].error).toBeUndefined()
      expect(assistant.toolCalls![1].error).toBe('后续操作失败')
      expect(assistant.toolCalls![1].result).toEqual({ error: '后续操作失败' })
    })

    it('overwrites existing result when tool_error has matching runId', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_call', phase: 'calling', tools: [{ id: 'run-xyz', name: 'update_schema', arguments: {} }] },
        { type: 'tool_call', phase: 'result', tools: [{ id: 'run-xyz', name: 'update_schema', result: { success: true } }] },
        { type: 'tool_error', toolName: 'update_schema', runId: 'run-xyz', content: '写入失败' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('test')

      const assistant = store.messages[1]
      expect(assistant.toolCalls).toHaveLength(1)
      expect(assistant.toolCalls![0]).toMatchObject({
        id: 'run-xyz',
        error: '写入失败',
        result: { error: '写入失败' },
      })
    })

    it('tool_error does not block subsequent text events', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_call', phase: 'calling', tools: [{ id: 'r1', name: 'save_and_bind_schema', arguments: {} }] },
        { type: 'tool_error', toolName: 'save_and_bind_schema', runId: 'r1', content: '数据库超时' },
        { type: 'text', content: '工具调用失败了，让我换个方式试试。' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('test')

      const assistant = store.messages[1]
      expect(assistant.toolCalls).toHaveLength(1)
      expect(assistant.toolCalls![0].error).toBe('数据库超时')
      expect(assistant.content).toBe('工具调用失败了，让我换个方式试试。')
      expect(assistant.status).not.toBe('error')
    })
  })

  // ---- S6-02: retryToolCall ----

  describe('S6-02: retryToolCall', () => {
    it('clears error and re-sends message on retry', async () => {
      const store = useAiStore()
      // First message: tool fails
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_error', toolName: 'save_widget', content: '数据库连接超时' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('保存组件')

      const assistant = store.messages[1]
      expect(assistant.toolCalls![0].error).toBe('数据库连接超时')

      // Retry: tool succeeds
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: '已保存' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.retryToolCall(1, 0)

      // Error should be cleared, message re-sent
      expect(store.messages[1].toolCalls![0].error).toBeUndefined()
      expect(store.messages[1].toolCalls![0].result).toBeUndefined()
      expect(store.loading).toBe(false)
    })

    it('does nothing when messageIndex is out of range', async () => {
      const store = useAiStore()
      // Should not throw
      await store.retryToolCall(99, 0)
      expect(store.loading).toBe(false)
    })

    it('does nothing when toolCallIndex is out of range', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_error', toolName: 'save_widget', content: '失败' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('test')

      // Invalid tool call index
      await store.retryToolCall(1, 99)
      expect(store.loading).toBe(false)
    })

    it('does nothing when tool call has no error', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_call', phase: 'calling', tools: [{ id: '1', name: 'get_widgets', arguments: {} }] },
        { type: 'tool_call', phase: 'result', tools: [{ id: '1', name: 'get_widgets', result: { data: [] } }] },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('test')

      // Tool call succeeded, retry should be no-op
      await store.retryToolCall(1, 0)
      expect(store.loading).toBe(false)
    })

    it('does nothing when message is not assistant', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: 'ok' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('hello')

      // Index 0 is user message
      await store.retryToolCall(0, 0)
      expect(store.loading).toBe(false)
    })

    it('re-sends the original user message content', async () => {
      const store = useAiStore()
      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'tool_error', toolName: 'gen_schema', content: '失败' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.sendMessage('生成注册表单')

      vi.mocked(chat).mockReturnValue(mockSSEStream([
        { type: 'text', content: 'ok' },
        { type: 'done', conversationId: 'conv-1' },
      ]))

      await store.retryToolCall(1, 0)

      // Should re-use the original user message
      expect(chat).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: '生成注册表单' }),
        expect.any(AbortSignal),
      )
    })
  })
})
