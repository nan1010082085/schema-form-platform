/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chat, getConversations, deleteConversation, publish, AiApiError } from '@/api/aiApi'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AiApiError', () => {
  it('stores status and message', () => {
    const err = new AiApiError('not found', 404)
    expect(err.message).toBe('not found')
    expect(err.status).toBe(404)
    expect(err.name).toBe('AiApiError')
  })
})

describe('chat', () => {
  function mockSSEResponse(events: string[]) {
    const encoder = new TextEncoder()
    let index = 0
    const stream = new ReadableStream({
      pull(controller) {
        if (index < events.length) {
          controller.enqueue(encoder.encode(events[index]))
          index++
        } else {
          controller.close()
        }
      },
    })

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: stream,
    })
  }

  it('parses SSE events from stream', async () => {
    mockSSEResponse([
      'data: {"type":"text","content":"Hello"}\n\n',
      'data: {"type":"schema","payload":[{"id":"1","type":"input"}],"description":"done"}\n\n',
      'data: {"type":"done","conversationId":"conv-1"}\n\n',
    ])

    const stream = chat({
      message: '生成表单',
      context: { source: 'standalone' },
    })

    const reader = stream.getReader()
    const events = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      events.push(value)
    }

    expect(events).toHaveLength(3)
    expect(events[0]).toEqual({ type: 'text', content: 'Hello' })
    expect(events[1]).toEqual({ type: 'schema', payload: [{ id: '1', type: 'input' }], description: 'done' })
    expect(events[2]).toEqual({ type: 'done', conversationId: 'conv-1' })
  })

  it('handles [DONE] marker', async () => {
    mockSSEResponse([
      'data: {"type":"text","content":"hi"}\n\n',
      'data: [DONE]\n\n',
    ])

    const stream = chat({ message: 'test', context: { source: 'standalone' } })
    const reader = stream.getReader()
    const events = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      events.push(value)
    }

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'text', content: 'hi' })
  })

  it('skips malformed JSON lines', async () => {
    mockSSEResponse([
      'data: not-json\n\n',
      'data: {"type":"text","content":"ok"}\n\n',
    ])

    const stream = chat({ message: 'test', context: { source: 'standalone' } })
    const reader = stream.getReader()
    const events = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      events.push(value)
    }

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'text', content: 'ok' })
  })

  it('errors on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const stream = chat({ message: 'test', context: { source: 'standalone' } })
    const reader = stream.getReader()

    await expect(reader.read()).rejects.toThrow()
  })

  it('sends correct request body', async () => {
    mockSSEResponse([])

    const stream = chat({
      conversationId: 'conv-1',
      message: 'hello',
      context: { source: 'editor', schemaId: 's1' },
    })
    // Consume stream
    const reader = stream.getReader()
    await reader.read()

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: 'conv-1',
          message: 'hello',
          context: { source: 'editor', schemaId: 's1' },
        }),
      }),
    )
  })
})

describe('getConversations', () => {
  it('returns data from response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [{ id: '1', title: 'test' }] }),
    })

    const result = await getConversations()
    expect(result).toEqual([{ id: '1', title: 'test' }])
  })

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Error',
      json: () => Promise.resolve({ success: false, error: { message: 'db error' } }),
    })

    await expect(getConversations()).rejects.toThrow('db error')
  })
})

describe('deleteConversation', () => {
  it('sends DELETE request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    await deleteConversation('conv-1')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/conversations/conv-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('publish', () => {
  it('sends publish request and returns data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: 's1', publishId: 'p1' } }),
    })

    const result = await publish({
      conversationId: 'conv-1',
      type: 'schema',
      payload: [{ id: '1', type: 'input' }],
    })

    expect(result).toEqual({ id: 's1', publishId: 'p1' })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/publish',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
