/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chat, getConversations, deleteConversation, publish, searchConversations, AiApiError } from '@/api/aiApi'
import type { SSEEvent } from '@/types'

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

  // ---- SSE 解析丢帧修复验证 ----

  /** Helper: send raw string chunks (each becomes one TCP chunk) */
  function mockSSERawChunks(chunks: string[]) {
    const encoder = new TextEncoder()
    let index = 0
    const stream = new ReadableStream({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(encoder.encode(chunks[index]))
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

  /** Helper: collect all events from a ReadableStream */
  async function collectEvents(stream: ReadableStream<SSEEvent>): Promise<SSEEvent[]> {
    const reader = stream.getReader()
    const events: SSEEvent[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      events.push(value)
    }
    return events
  }

  it('flushes buffer when last event has no trailing newline', async () => {
    // Last event has only one \n instead of \n\n — must not be lost
    mockSSERawChunks([
      'data: {"type":"text","content":"Hello"}\n\n',
      'data: {"type":"text","content":"World"}\n',
    ])

    const stream = chat({ message: 'test', context: { source: 'standalone' } })
    const events = await collectEvents(stream)

    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: 'text', content: 'Hello' })
    expect(events[1]).toEqual({ type: 'text', content: 'World' })
  })

  it('flushes buffer when last event has no newline at all', async () => {
    // Last event has zero newlines — the most extreme case
    mockSSERawChunks([
      'data: {"type":"text","content":"First"}\n\n',
      'data: {"type":"done","conversationId":"c1"}',
    ])

    const stream = chat({ message: 'test', context: { source: 'standalone' } })
    const events = await collectEvents(stream)

    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: 'text', content: 'First' })
    expect(events[1]).toEqual({ type: 'done', conversationId: 'c1' })
  })

  it('handles multiple events in a single chunk', async () => {
    mockSSERawChunks([
      'data: {"type":"text","content":"A"}\n\ndata: {"type":"text","content":"B"}\n\ndata: {"type":"text","content":"C"}\n\n',
    ])

    const stream = chat({ message: 'test', context: { source: 'standalone' } })
    const events = await collectEvents(stream)

    expect(events).toHaveLength(3)
    expect(events[0]).toEqual({ type: 'text', content: 'A' })
    expect(events[1]).toEqual({ type: 'text', content: 'B' })
    expect(events[2]).toEqual({ type: 'text', content: 'C' })
  })

  it('handles chunk boundary splitting a JSON value', async () => {
    // The JSON payload "Hello" is split across two chunks: "Hel" and "lo"
    mockSSERawChunks([
      'data: {"type":"text","content":"Hel',
      'lo"}\n\n',
    ])

    const stream = chat({ message: 'test', context: { source: 'standalone' } })
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'text', content: 'Hello' })
  })

  it('skips comment lines (heartbeat)', async () => {
    mockSSERawChunks([
      ':heartbeat\n\n',
      'data: {"type":"text","content":"alive"}\n\n',
      ':heartbeat\n\n',
      'data: {"type":"done","conversationId":"c1"}\n\n',
    ])

    const stream = chat({ message: 'test', context: { source: 'standalone' } })
    const events = await collectEvents(stream)

    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: 'text', content: 'alive' })
    expect(events[1]).toEqual({ type: 'done', conversationId: 'c1' })
  })

  it('handles data: without space (SSE spec compliance)', async () => {
    mockSSERawChunks([
      'data:{"type":"text","content":"no-space"}\n\n',
    ])

    const stream = chat({ message: 'test', context: { source: 'standalone' } })
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'text', content: 'no-space' })
  })

  it('handles [DONE] in buffer flush (no trailing newline)', async () => {
    mockSSERawChunks([
      'data: {"type":"text","content":"final"}\n\n',
      'data: [DONE]',
    ])

    const stream = chat({ message: 'test', context: { source: 'standalone' } })
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'text', content: 'final' })
  })

  it('handles chunk boundary splitting across many small pieces', async () => {
    // Simulate aggressive TCP fragmentation
    const fullEvent = 'data: {"type":"text","content":"fragmented"}\n\n'
    const chunks: string[] = []
    for (let i = 0; i < fullEvent.length; i += 3) {
      chunks.push(fullEvent.slice(i, i + 3))
    }

    mockSSERawChunks(chunks)

    const stream = chat({ message: 'test', context: { source: 'standalone' } })
    const events = await collectEvents(stream)

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'text', content: 'fragmented' })
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

describe('searchConversations', () => {
  it('sends search params and returns data', async () => {
    const mockData = {
      conversations: [{ id: '1', title: 'test' }],
      total: 1,
      page: 1,
      pageSize: 20,
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockData }),
    })

    const result = await searchConversations({ keyword: 'test' })
    expect(result).toEqual(mockData)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('keyword=test'),
      undefined,
    )
  })

  it('sends all params when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { conversations: [], total: 0, page: 2, pageSize: 10 } }),
    })

    await searchConversations({
      keyword: 'hello',
      startDate: '2026-01-01',
      endDate: '2026-06-01',
      source: 'editor',
      page: 2,
      pageSize: 10,
    })

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('keyword=hello')
    expect(calledUrl).toContain('source=editor')
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('pageSize=10')
  })

  it('omits empty params', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { conversations: [], total: 0, page: 1, pageSize: 20 } }),
    })

    await searchConversations({})
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/conversations/search',
      undefined,
    )
  })

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Error',
      json: () => Promise.resolve({ success: false, error: { message: 'search failed' } }),
    })

    await expect(searchConversations({ keyword: 'test' })).rejects.toThrow('search failed')
  })
})
