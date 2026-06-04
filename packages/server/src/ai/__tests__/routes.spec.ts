/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock graph module — prevents graph.ts (and its transitive deps) from loading
vi.mock('../graph/graph.js', () => ({
  graph: {
    streamEvents: vi.fn(),
  },
}))

vi.mock('../services/conversationService.js', () => ({
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  appendMessage: vi.fn(),
  listConversations: vi.fn(),
  deleteConversation: vi.fn(),
  maybeGenerateSummary: vi.fn(),
  searchConversations: vi.fn(),
}))

vi.mock('../services/versionService.js', () => ({
  createVersion: vi.fn().mockResolvedValue({ _id: 'ver-1', version: 1 }),
  getVersions: vi.fn(),
  getVersion: vi.fn(),
}))

vi.mock('../../models/FormSchema.js', () => ({
  FormSchemaModel: { findById: vi.fn() },
}))

vi.mock('../../models/PublishedSchema.js', () => ({
  PublishedSchemaModel: { create: vi.fn() },
}))

vi.mock('../../flow-models/FlowDefinition.js', () => ({
  FlowDefinitionModel: { create: vi.fn(), findByIdAndUpdate: vi.fn() },
}))

vi.mock('../../flow-models/FlowVersion.js', () => ({
  FlowVersionModel: { findOne: vi.fn(), create: vi.fn() },
}))

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}))

import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import http from 'node:http'
import aiRouter from '../routes.js'
import { graph } from '../graph/graph.js'
import * as convoService from '../services/conversationService.js'

let server: http.Server | null = null
let baseUrl = ''

async function request(method: string, path: string, body?: unknown) {
  const url = `${baseUrl}${path}`
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) init.body = JSON.stringify(body)

  const res = await fetch(url, init)
  const text = await res.text()

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('text/event-stream')) {
    return { status: res.status, headers: res.headers, text, sse: true }
  }

  try {
    return { status: res.status, headers: res.headers, body: JSON.parse(text), sse: false }
  } catch {
    return { status: res.status, headers: res.headers, body: text, sse: false }
  }
}

/** Create an async iterable from an array of events (simulates graph.streamEvents output). */
function mockStreamEvents(events: Array<Record<string, unknown>>) {
  return (async function* () {
    for (const event of events) {
      yield event
    }
  })()
}

beforeEach(async () => {
  vi.clearAllMocks()

  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = null
  }

  const app = new Koa()
  app.use(bodyParser())
  app.use(aiRouter.routes())
  app.use(aiRouter.allowedMethods())

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server!.address() as { port: number }
      baseUrl = `http://localhost:${addr.port}`
      resolve()
    })
  })
})

describe('POST /api/ai/chat', () => {
  it('returns 400 for missing message', async () => {
    const res = await request('POST', '/api/ai/chat', { context: { source: 'standalone' } })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid source', async () => {
    const res = await request('POST', '/api/ai/chat', {
      message: 'hello',
      context: { source: 'bad' },
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent conversation', async () => {
    vi.mocked(convoService.getConversation).mockResolvedValue(null)

    const res = await request('POST', '/api/ai/chat', {
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
      message: 'hello',
      context: { source: 'standalone' },
    })
    expect(res.status).toBe(404)
  })

  it('creates conversation and returns SSE with text and done events', async () => {
    const mockConvo = { _id: 'conv-1', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)

    vi.mocked(graph.streamEvents).mockReturnValue(
      mockStreamEvents([
        { event: 'on_chain_start', name: 'editor' },
        {
          event: 'on_chat_model_stream',
          data: { chunk: { content: '已为您生成表单' } },
        },
        { event: 'on_chain_end', name: '__end__', data: {} },
      ]),
    )

    const res = await request('POST', '/api/ai/chat', {
      message: '生成表单',
      context: { source: 'standalone' },
    })

    expect(res.status).toBe(200)
    expect(res.sse).toBe(true)
    expect(res.text).toContain('data: ')
    expect(res.text).toContain('"type":"text"')
    expect(res.text).toContain('"type":"done"')
  })

  it('emits flow event when validate_flow tool produces flow payload', async () => {
    const mockConvo = { _id: 'conv-2', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)

    vi.mocked(graph.streamEvents).mockReturnValue(
      mockStreamEvents([
        { event: 'on_chain_start', name: 'flow' },
        {
          event: 'on_chat_model_stream',
          data: { chunk: { content: '已生成审批流程' } },
        },
        {
          event: 'on_tool_start',
          name: 'validate_flow',
          data: { input: { flow: { nodes: [{ id: 'n1' }], edges: [] } } },
          run_id: 'tc-flow-1',
        },
        {
          event: 'on_tool_end',
          name: 'validate_flow',
          data: { output: { success: true, data: { valid: true, errors: [] } } },
          run_id: 'tc-flow-1',
        },
        { event: 'on_chain_end', name: '__end__', data: {} },
      ]),
    )

    const res = await request('POST', '/api/ai/chat', {
      message: '生成流程',
      context: { source: 'flow' },
    })

    expect(res.status).toBe(200)
    expect(res.sse).toBe(true)
    expect(res.text).toContain('"type":"flow"')
    expect(res.text).toContain('"type":"done"')
  })

  it('forwards tool_call events with calling and result phases', async () => {
    const mockConvo = { _id: 'conv-3', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)

    vi.mocked(graph.streamEvents).mockReturnValue(
      mockStreamEvents([
        { event: 'on_chain_start', name: 'editor' },
        {
          event: 'on_tool_start',
          name: 'search_schemas',
          data: { input: { keyword: '用户' } },
          run_id: 'tc-1',
        },
        {
          event: 'on_tool_end',
          name: 'search_schemas',
          data: { output: { success: true, data: { total: 1 } } },
          run_id: 'tc-1',
        },
        {
          event: 'on_chat_model_stream',
          data: { chunk: { content: '找到相关表单' } },
        },
        { event: 'on_chain_end', name: '__end__', data: {} },
      ]),
    )

    const res = await request('POST', '/api/ai/chat', {
      message: '查找用户相关的表单',
      context: { source: 'standalone' },
    })

    expect(res.status).toBe(200)
    expect(res.sse).toBe(true)
    expect(res.text).toContain('"type":"tool_call"')
    expect(res.text).toContain('"phase":"calling"')
    expect(res.text).toContain('"phase":"result"')
    expect(res.text).toContain('"name":"search_schemas"')
    expect(res.text).toContain('"type":"done"')
  })

  it('calls graph.streamEvents with correct input state', async () => {
    const mockConvo = { _id: 'conv-4', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)

    vi.mocked(graph.streamEvents).mockReturnValue(mockStreamEvents([]))

    const res = await request('POST', '/api/ai/chat', {
      message: '帮我做一个审批流程',
      context: { source: 'flow' },
    })

    expect(res.status).toBe(200)
    expect(graph.streamEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.any(Array),
        context: expect.objectContaining({
          source: 'flow',
          turnCount: 1,
        }),
        sessionId: 'conv-4',
        currentAgent: 'router',
      }),
      expect.objectContaining({
        version: 'v2',
        configurable: { thread_id: 'conv-4' },
      }),
    )
  })

  it('emits agent_switch event when editor agent starts', async () => {
    const mockConvo = { _id: 'conv-5', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)

    vi.mocked(graph.streamEvents).mockReturnValue(
      mockStreamEvents([
        { event: 'on_chain_start', name: 'editor' },
        {
          event: 'on_chat_model_stream',
          data: { chunk: { content: '回复内容' } },
        },
        { event: 'on_chain_end', name: '__end__', data: {} },
      ]),
    )

    const res = await request('POST', '/api/ai/chat', {
      message: '做点什么',
      context: { source: 'standalone' },
    })

    expect(res.status).toBe(200)
    expect(res.text).toContain('"type":"agent_switch"')
    expect(res.text).toContain('"agent":"editor"')
  })

  it('emits schema event from validate_schema tool', async () => {
    const mockConvo = { _id: 'conv-6', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)

    vi.mocked(graph.streamEvents).mockReturnValue(
      mockStreamEvents([
        { event: 'on_chain_start', name: 'editor' },
        {
          event: 'on_tool_start',
          name: 'validate_schema',
          data: { input: { widgets: [{ id: '1', type: 'input' }] } },
          run_id: 'tc-s1',
        },
        {
          event: 'on_tool_end',
          name: 'validate_schema',
          data: { output: { success: true, data: { valid: true, errors: [] } } },
          run_id: 'tc-s1',
        },
        { event: 'on_chain_end', name: '__end__', data: {} },
      ]),
    )

    const res = await request('POST', '/api/ai/chat', {
      message: '生成表单',
      context: { source: 'standalone' },
    })

    expect(res.status).toBe(200)
    expect(res.text).toContain('"type":"schema"')
    expect(res.text).toContain('"type":"done"')
  })

  it('emits schema event from generate_schema tool', async () => {
    const mockConvo = { _id: 'conv-7', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)

    vi.mocked(graph.streamEvents).mockReturnValue(
      mockStreamEvents([
        { event: 'on_chain_start', name: 'flow' },
        {
          event: 'on_tool_start',
          name: 'generate_schema',
          data: { input: { description: '采购申请表单' } },
          run_id: 'tc-gs1',
        },
        {
          event: 'on_tool_end',
          name: 'generate_schema',
          data: {
            output: {
              success: true,
              data: {
                widgets: [{ id: '1', type: 'input' }],
                summary: '已生成表单',
              },
            },
          },
          run_id: 'tc-gs1',
        },
        { event: 'on_chain_end', name: '__end__', data: {} },
      ]),
    )

    const res = await request('POST', '/api/ai/chat', {
      message: '为审批生成表单',
      context: { source: 'flow' },
    })

    expect(res.status).toBe(200)
    expect(res.text).toContain('"type":"schema"')
    expect(res.text).toContain('"type":"done"')
  })

  it('sends error event when graph.streamEvents throws', async () => {
    const mockConvo = { _id: 'conv-8', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)

    vi.mocked(graph.streamEvents).mockImplementation(() => {
      throw new Error('Graph compilation failed')
    })

    const res = await request('POST', '/api/ai/chat', {
      message: '测试错误',
      context: { source: 'standalone' },
    })

    expect(res.status).toBe(200)
    expect(res.sse).toBe(true)
    expect(res.text).toContain('"type":"error"')
    expect(res.text).toContain('Graph compilation failed')
    // done event is guaranteed by the finally block even on error
    expect(res.text).toContain('"type":"done"')
  })
})

describe('POST /api/ai/publish', () => {
  it('returns 400 for missing fields', async () => {
    const res = await request('POST', '/api/ai/publish', { type: 'schema' })
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent conversation', async () => {
    vi.mocked(convoService.getConversation).mockResolvedValue(null)

    const res = await request('POST', '/api/ai/publish', {
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'schema',
      payload: [],
    })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/ai/conversations', () => {
  it('returns conversation list', async () => {
    vi.mocked(convoService.listConversations).mockResolvedValue([
      { _id: '1', source: 'standalone', messages: [{ role: 'user', content: 'hello', timestamp: new Date() }], activeAgent: 'router', createdAt: new Date(), updatedAt: new Date() },
      { _id: '2', source: 'editor', messages: [], activeAgent: 'editor', createdAt: new Date(), updatedAt: new Date() },
    ] as any)

    const res = await request('GET', '/api/ai/conversations')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data[0].title).toBe('hello')
    expect(res.body.data[1].title).toBe('New conversation')
  })
})

describe('DELETE /api/ai/conversations/:id', () => {
  it('returns 404 when conversation not found', async () => {
    vi.mocked(convoService.deleteConversation).mockResolvedValue(false)

    const res = await request('DELETE', '/api/ai/conversations/nonexistent')
    expect(res.status).toBe(404)
  })

  it('returns success when deleted', async () => {
    vi.mocked(convoService.deleteConversation).mockResolvedValue(true)

    const res = await request('DELETE', '/api/ai/conversations/conv-1')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
