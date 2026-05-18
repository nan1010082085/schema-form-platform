/**
 * Backend Smoke Test — Sprint 20
 * Tests Koa + Prisma API endpoints end-to-end.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import Koa from 'koa'
import cors from '@koa/cors'
import { errorHandler } from '../middleware/errorHandler.js'
import healthRouter from '../routes/health.js'
import schemaRouter from '../routes/schema.js'

// ── Helpers ──

let server: ReturnType<typeof http.createServer> | null = null
const BASE = 'http://localhost:3002'

function get(path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode ?? 0, body: data.substring(0, 500) }) }
      })
    }).on('error', reject)
  })
}

function post(rpath: string, payload: object): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const req = http.request(`${BASE}${rpath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body).toString() },
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode ?? 0, body: data.substring(0, 500) }) }
      })
    })
    req.write(body)
    req.end()
  })
}

function del(rpath: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE}${rpath}`, { method: 'DELETE' }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode ?? 0, body: data.substring(0, 500) }) }
      })
    })
    req.end()
  })
}

// ── Tests ──

/** Inline Koa JSON body parser — needed because koa-bodyparser is not a dependency */
async function jsonBodyParser(ctx: any, next: () => Promise<any>) {
  if (ctx.method === 'POST' || ctx.method === 'PUT' || ctx.method === 'PATCH') {
    const body = await new Promise<string>((resolve) => {
      let data = ''
      ctx.req.on('data', (chunk: Buffer | string) => { data += chunk })
      ctx.req.on('end', () => resolve(data))
    })
    try {
      ctx.request.body = JSON.parse(body || '{}')
    } catch {
      ctx.request.body = {}
    }
  } else {
    ctx.request.body = {}
  }
  await next()
}

describe('Backend Smoke Test (Koa + MongoDB)', () => {
  beforeAll(async () => {
    const app = new Koa()
    app.use(errorHandler)
    app.use(jsonBodyParser)
    // NOTE: helmet v8 is not directly compatible with Koa (requires koa-helmet wrapper)
    // The real server's index.ts has the same issue — use koa-helmet in production
    app.use(cors({ origin: () => '' }))
    app.use(healthRouter.routes())
    app.use(healthRouter.allowedMethods())
    app.use(schemaRouter.routes())
    app.use(schemaRouter.allowedMethods())

    await new Promise<void>((resolve) => {
      server = app.listen(3002, () => resolve())
    })
    console.log('[backend-smoke] Server started on port 3002')
  }, 30000)

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => { server!.close(() => resolve()) })
      console.log('[backend-smoke] Server closed')
    }
  })

  // ── Health ──

  it('GET /api/health returns ok status', async () => {
    const { status, body } = await get('/api/health')
    expect(status).toBe(200)
    expect(body).toHaveProperty('status', 'ok')
    expect(body).toHaveProperty('timestamp')
    expect(body).toHaveProperty('uptime')
    expect(body).toHaveProperty('database')
  })

  // ── CRUD ──

  let createdId: string

  it('POST /api/schemas creates a new schema', async () => {
    const payload = { name: 'E2E Test Schema', json: { type: 'page', children: [] } }
    const { status, body } = await post('/api/schemas', payload)
    expect(status).toBe(201)
    expect(body).toHaveProperty('success', true)
    expect(body.data).toHaveProperty('id')
    expect(body.data).toHaveProperty('name', 'E2E Test Schema')
    createdId = body.data.id
  })

  it('GET /api/schemas lists schemas (includes created one)', async () => {
    const { status, body } = await get('/api/schemas')
    expect(status).toBe(200)
    expect(body).toHaveProperty('success', true)
    expect(body.data).toHaveProperty('items')
    expect(body.data).toHaveProperty('total')
    expect(Array.isArray(body.data.items)).toBe(true)
    const found = body.data.items.find((item: any) => item.id === createdId)
    expect(found).toBeDefined()
  })

  it('GET /api/schemas/:id returns single schema', async () => {
    const { status, body } = await get(`/api/schemas/${createdId}`)
    expect(status).toBe(200)
    expect(body.data).toHaveProperty('id', createdId)
  })

  it('GET /api/schemas/:id returns 404 for non-existent ID', async () => {
    const { status, body } = await get('/api/schemas/00000000-0000-0000-0000-000000000000')
    expect(status).toBe(404)
    expect(body).toHaveProperty('success', false)
  })

  it('GET /api/schemas/:id returns 400 for invalid UUID', async () => {
    const { status, body } = await get('/api/schemas/not-a-uuid')
    expect(status).toBe(400)
    expect(body).toHaveProperty('success', false)
  })

  it('DELETE /api/schemas/:id deletes the schema', async () => {
    const { status, body } = await del(`/api/schemas/${createdId}`)
    expect(status).toBe(200)
    expect(body).toHaveProperty('success', true)
    expect(body).toHaveProperty('data', null)

    const { status: getStatus } = await get(`/api/schemas/${createdId}`)
    expect(getStatus).toBe(404)
  })

  // ── Validation ──

  it('POST /api/schemas rejects empty name', async () => {
    const { status, body } = await post('/api/schemas', { name: '', json: {} } as any)
    expect(status).toBe(400)
    expect(body).toHaveProperty('success', false)
  })

  it('POST /api/schemas rejects missing json', async () => {
    const { status, body } = await post('/api/schemas', { name: 'test' } as any)
    expect(status).toBe(400)
    expect(body).toHaveProperty('success', false)
  })

  // ── Search & Pagination ──

  it('GET /api/schemas supports search query', async () => {
    const uniqueName = `SearchTest_${Date.now()}`
    const createRes = await post('/api/schemas', { name: uniqueName, json: { type: 'page', children: [] } })
    const searchId = (createRes.body as any).data.id

    const { status, body } = await get(`/api/schemas?search=${encodeURIComponent(uniqueName)}`)
    expect(status).toBe(200)
    expect(body.data.items.length).toBeGreaterThanOrEqual(1)

    await del(`/api/schemas/${searchId}`)
  })

  it('GET /api/schemas supports pagination', async () => {
    const { status, body } = await get('/api/schemas?page=1&pageSize=5')
    expect(status).toBe(200)
    expect(body.data).toHaveProperty('page', 1)
    expect(body.data).toHaveProperty('pageSize', 5)
  })
})
