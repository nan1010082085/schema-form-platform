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
      vi.mocked(chat).mockReturnValue(new ReadableStream({
        start(controller) {
          controller.error(new Error('Network error'))
        },
      }))

      await store.sendMessage('test')

      expect(store.error).toBe('Network error')
      expect(store.messages[1].content).toContain('Error')
      expect(store.loading).toBe(false)
    })

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

    it('publishes schema and returns publishId', async () => {
      const store = useAiStore()
      store.currentConversationId = 'conv-1'
      store.currentSchema = [{ id: '1', type: 'input' }] as any
      vi.mocked(publish).mockResolvedValue({ id: 's1', publishId: 'p1' })

      const result = await store.publishCurrent()

      expect(result).toBe('p1')
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

      expect(result).toBe('p2')
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
})
