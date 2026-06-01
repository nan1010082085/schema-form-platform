/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all dependencies before importing routes
vi.mock('../graph/editorAgent.js', () => ({
  streamEditorAgent: vi.fn(),
}))

vi.mock('../graph/flowAgent.js', () => ({
  streamFlowAgent: vi.fn(),
}))

vi.mock('../services/conversationService.js', () => ({
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  appendMessage: vi.fn(),
  listConversations: vi.fn(),
  deleteConversation: vi.fn(),
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

vi.mock('../graph/router.js', () => ({
  routerNode: vi.fn(),
}))

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}))

import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import http from 'node:http'
import aiRouter from '../routes.js'
import { streamEditorAgent } from '../graph/editorAgent.js'
import { routerNode } from '../graph/router.js'
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

  // For SSE responses, return raw text
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

  it('creates conversation and returns SSE on success (streaming)', async () => {
    const mockConvo = { _id: 'conv-1', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)
    vi.mocked(routerNode).mockResolvedValue({ activeAgent: 'editor' })

    // Mock the streaming editor agent to yield events
    async function* mockStream() {
      yield { type: 'thinking' as const, content: '思考中...' }
      yield { type: 'text' as const, content: '已生成表单' }
      yield { type: 'tip' as const, content: '建议添加验证' }
      yield { type: 'schema' as const, payload: [{ id: '1', type: 'input' }] }
    }
    vi.mocked(streamEditorAgent).mockReturnValue(mockStream())

    const res = await request('POST', '/api/ai/chat', {
      message: '生成表单',
      context: { source: 'standalone' },
    })

    expect(res.status).toBe(200)
    expect(res.sse).toBe(true)
    expect(res.text).toContain('data: ')
    expect(res.text).toContain('"type":"thinking"')
    expect(res.text).toContain('"type":"text"')
    expect(res.text).toContain('"type":"tip"')
    expect(res.text).toContain('"type":"schema"')
    expect(res.text).toContain('"type":"done"')
  })

  it('uses streamFlowAgent for flow source', async () => {
    const mockConvo = { _id: 'conv-2', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)

    async function* mockFlowStream() {
      yield { type: 'thinking' as const, content: '分析流程需求...' }
      yield { type: 'text' as const, content: '已生成审批流程' }
      yield { type: 'flow' as const, payload: { nodes: [{ id: 'n1' }], edges: [] } }
    }
    const { streamFlowAgent } = await import('../graph/flowAgent.js')
    vi.mocked(streamFlowAgent).mockReturnValue(mockFlowStream())

    const res = await request('POST', '/api/ai/chat', {
      message: '生成流程',
      context: { source: 'flow' },
    })

    expect(res.status).toBe(200)
    expect(res.sse).toBe(true)
    expect(res.text).toContain('"type":"thinking"')
    expect(res.text).toContain('"type":"flow"')
    expect(res.text).toContain('"type":"done"')
  })

  it('forwards tool_call events with calling and result phases', async () => {
    const mockConvo = { _id: 'conv-3', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)
    vi.mocked(routerNode).mockResolvedValue({ activeAgent: 'editor' })

    async function* mockToolStream() {
      yield {
        type: 'tool_call' as const,
        toolCalls: [{ id: 'tc-1', name: 'search_schemas', arguments: { keyword: '用户' } }],
      }
      yield {
        type: 'tool_call' as const,
        toolResults: [{ id: 'tc-1', name: 'search_schemas', result: { success: true, data: { total: 1 } } }],
      }
      yield { type: 'text' as const, content: '找到相关表单' }
    }
    vi.mocked(streamEditorAgent).mockReturnValue(mockToolStream())

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

  it('uses router to resolve agent for standalone source', async () => {
    const mockConvo = { _id: 'conv-4', messages: [] }
    vi.mocked(convoService.createConversation).mockResolvedValue(mockConvo as any)
    vi.mocked(convoService.appendMessage).mockResolvedValue(null)
    vi.mocked(routerNode).mockResolvedValue({ activeAgent: 'flow' })

    async function* mockFlowStream() {
      yield { type: 'text' as const, content: '流程已生成' }
      yield { type: 'flow' as const, payload: { nodes: [{ id: 'n1' }], edges: [] } }
    }
    const { streamFlowAgent } = await import('../graph/flowAgent.js')
    vi.mocked(streamFlowAgent).mockReturnValue(mockFlowStream())

    const res = await request('POST', '/api/ai/chat', {
      message: '帮我做一个审批流程',
      context: { source: 'standalone' },
    })

    expect(res.status).toBe(200)
    expect(res.sse).toBe(true)
    expect(routerNode).toHaveBeenCalled()
    expect(res.text).toContain('"type":"flow"')
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
