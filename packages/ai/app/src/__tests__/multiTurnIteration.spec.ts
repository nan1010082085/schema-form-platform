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

import { chat } from '@/api/aiApi'

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

describe('Multi-turn iteration', () => {
  it('sends currentSchema in context on second message', async () => {
    const store = useAiStore()
    const schema = [{ id: 'form_a1b2c', type: 'form', label: '表单', children: [{ id: 'input_1', type: 'input', field: 'name', label: '姓名' }] }]

    // First message: AI generates schema
    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'schema', payload: schema, description: '表单已生成' },
      { type: 'done', conversationId: 'conv-1' },
    ]))

    await store.sendMessage('生成一个用户注册表单')
    expect(store.currentSchema).toEqual(schema)

    // Second message: user wants to modify
    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'text', content: '已修改' },
      { type: 'done', conversationId: 'conv-1' },
    ]))

    await store.sendMessage('把姓名改成用户名')

    // Verify the chat API was called with currentSchema in context
    expect(chat).toHaveBeenLastCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          currentSchema: schema,
        }),
      }),
      expect.any(AbortSignal),
    )
  })

  it('sends currentFlow in context on second message', async () => {
    const store = useAiStore()
    const flow = { nodes: [{ id: 'n1', data: { bpmnType: 'startEvent', label: '开始' } }], edges: [] }

    // First message: AI generates flow
    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'flow', payload: flow, description: '流程已生成' },
      { type: 'done', conversationId: 'conv-1' },
    ]))

    await store.sendMessage('创建一个审批流程')
    expect(store.currentFlow).toEqual(flow)

    // Second message: user wants to modify
    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'text', content: '已修改' },
      { type: 'done', conversationId: 'conv-1' },
    ]))

    await store.sendMessage('加一个审批节点')

    expect(chat).toHaveBeenLastCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          currentFlow: flow,
        }),
      }),
      expect.any(AbortSignal),
    )
  })

  it('sends both currentSchema and currentFlow when both exist', async () => {
    const store = useAiStore()
    const schema = [{ id: 's1', type: 'input', field: 'name' }]
    const flow = { nodes: [{ id: 'n1', data: {} }], edges: [] }

    store.setCurrentSchema(schema as any)
    store.setCurrentFlow(flow as any)

    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'text', content: 'ok' },
      { type: 'done', conversationId: 'conv-1' },
    ]))

    await store.sendMessage('修改一下')

    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          currentSchema: schema,
          currentFlow: flow,
        }),
      }),
      expect.any(AbortSignal),
    )
  })

  it('does not send currentSchema when no schema exists', async () => {
    const store = useAiStore()

    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'text', content: 'ok' },
      { type: 'done', conversationId: 'conv-1' },
    ]))

    await store.sendMessage('你好')

    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.not.objectContaining({
          currentSchema: expect.anything(),
        }),
      }),
      expect.any(AbortSignal),
    )
  })

  it('updates currentSchema after schema event in subsequent turn', async () => {
    const store = useAiStore()
    const schema1 = [{ id: 's1', type: 'input', field: 'name' }]
    const schema2 = [{ id: 's1', type: 'input', field: 'userName' }, { id: 's2', type: 'input', field: 'email' }]

    // Turn 1: generate
    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'schema', payload: schema1, description: '初始表单' },
      { type: 'done', conversationId: 'conv-1' },
    ]))
    await store.sendMessage('生成表单')
    expect(store.currentSchema).toEqual(schema1)

    // Turn 2: modify - AI sends updated schema
    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'schema', payload: schema2, description: '已添加邮箱字段' },
      { type: 'done', conversationId: 'conv-1' },
    ]))
    await store.sendMessage('添加邮箱字段')
    expect(store.currentSchema).toEqual(schema2)

    // Turn 3: verify schema2 is carried forward
    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'text', content: 'ok' },
      { type: 'done', conversationId: 'conv-1' },
    ]))
    await store.sendMessage('再改一下')

    expect(chat).toHaveBeenLastCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          currentSchema: schema2,
        }),
      }),
      expect.any(AbortSignal),
    )
  })

  it('passes conversationId on subsequent turns for context continuity', async () => {
    const store = useAiStore()

    // Turn 1
    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'text', content: 'ok' },
      { type: 'done', conversationId: 'conv-1' },
    ]))
    await store.sendMessage('生成表单')

    // Turn 2
    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'text', content: 'sure' },
      { type: 'done', conversationId: 'conv-1' },
    ]))
    await store.sendMessage('修改一下')

    // Both calls should have conversationId
    expect(chat).toHaveBeenNthCalledWith(1,
      expect.objectContaining({ conversationId: undefined }),
      expect.any(AbortSignal),
    )
    expect(chat).toHaveBeenNthCalledWith(2,
      expect.objectContaining({ conversationId: 'conv-1' }),
      expect.any(AbortSignal),
    )
  })

  it('conversation has correct message count after multi-turn', async () => {
    const store = useAiStore()

    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'text', content: 'reply1' },
      { type: 'done', conversationId: 'conv-1' },
    ]))
    await store.sendMessage('hello')

    vi.mocked(chat).mockReturnValue(mockSSEStream([
      { type: 'text', content: 'reply2' },
      { type: 'done', conversationId: 'conv-1' },
    ]))
    await store.sendMessage('world')

    // 2 user + 2 assistant = 4 messages
    expect(store.messages).toHaveLength(4)
    expect(store.messages[0].role).toBe('user')
    expect(store.messages[0].content).toBe('hello')
    expect(store.messages[1].role).toBe('assistant')
    expect(store.messages[1].content).toBe('reply1')
    expect(store.messages[2].role).toBe('user')
    expect(store.messages[2].content).toBe('world')
    expect(store.messages[3].role).toBe('assistant')
    expect(store.messages[3].content).toBe('reply2')
  })
})
