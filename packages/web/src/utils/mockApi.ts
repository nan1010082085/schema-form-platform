/**
 * mockApi — 本地 Mock API 层
 *
 * 当 VITE_USE_MOCK=true 时，替换真实 API 客户端，
 * 返回本地假数据，无需后端服务即可调试设计器。
 *
 * 使用方式：在 .env.development 中设置 VITE_USE_MOCK=true
 */
import type {
  SchemaListItem,
  SchemaDetail,
  PaginatedResponse,
  PublishedSchemaItem,
  SchemaCreatePayload,
  SchemaUpdatePayload,
} from '@/types/api'
import type { FormSchemaItem } from '@/components/FormGrid/types'

// ---- 内存存储 ----

const MOCK_SCHEMAS = new Map<string, SchemaListItem>()
const MOCK_PUBLISHED = new Map<string, PublishedSchemaItem>()

// 初始化一个 demo schema
function initMockData() {
  const demoId = 'mock-demo-001'
  const demoSchema: FormSchemaItem[] = [
    {
      type: 'page',
      children: [
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col',
              span: 12,
              children: [
                { type: 'input', field: 'userName', label: '用户名', props: { placeholder: '请输入用户名' } },
              ],
            },
            {
              type: 'grid-col',
              span: 12,
              children: [
                { type: 'select', field: 'userRole', label: '角色', options: [{ label: '管理员', value: 'admin' }, { label: '普通用户', value: 'user' }] },
              ],
            },
          ],
        },
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col',
              span: 24,
              children: [
                { type: 'textarea', field: 'remark', label: '备注', props: { placeholder: '请输入备注' } },
              ],
            },
          ],
        },
      ],
    },
  ]

  MOCK_SCHEMAS.set(demoId, {
    id: demoId,
    editId: demoId,
    version: '20250101000000',
    name: 'Demo Form',
    type: 'form',
    status: 'draft',
    json: demoSchema,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

initMockData()

// ---- Mock API 实现 ----

let idCounter = 100

function genId(): string {
  return `mock-${Date.now().toString(36)}-${(idCounter++).toString(36)}`
}

function delay(ms = 50): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function mockFetchSchemas(options?: {
  search?: string
  type?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<SchemaListItem>> {
  await delay()
  let items = Array.from(MOCK_SCHEMAS.values())

  if (options?.search) {
    const q = options.search.toLowerCase()
    items = items.filter((s) => s.name.toLowerCase().includes(q))
  }
  if (options?.type) {
    items = items.filter((s) => s.type === options.type)
  }

  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 20
  const start = (page - 1) * pageSize
  const paged = items.slice(start, start + pageSize)

  return {
    items: paged,
    total: items.length,
    page,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize),
  }
}

export async function mockFetchSchemaById(id: string): Promise<SchemaDetail> {
  await delay()
  const schema = MOCK_SCHEMAS.get(id)
  if (!schema) throw new Error(`Schema not found: ${id}`)
  return { ...schema, json: schema.json ?? [] }
}

export async function mockCreateSchema(payload: SchemaCreatePayload): Promise<SchemaDetail> {
  await delay()
  const id = genId()
  const now = new Date().toISOString()
  const schema: SchemaListItem = {
    id,
    editId: payload.editId ?? id,
    version: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
    name: payload.name,
    type: payload.type,
    status: 'draft',
    json: payload.json,
    createdAt: now,
    updatedAt: now,
  }
  MOCK_SCHEMAS.set(id, schema)
  return { ...schema, json: payload.json }
}

export async function mockUpdateSchema(id: string, payload: SchemaUpdatePayload): Promise<SchemaDetail> {
  await delay()
  const existing = MOCK_SCHEMAS.get(id)
  if (!existing) throw new Error(`Schema not found: ${id}`)
  const updated: SchemaListItem = {
    ...existing,
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.json !== undefined ? { json: payload.json } : {}),
    ...(payload.type !== undefined ? { type: payload.type } : {}),
    updatedAt: new Date().toISOString(),
  }
  MOCK_SCHEMAS.set(id, updated)
  return { ...updated, json: updated.json ?? [] }
}

export async function mockDeleteSchema(id: string): Promise<null> {
  await delay()
  MOCK_SCHEMAS.delete(id)
  MOCK_PUBLISHED.delete(id)
  return null
}

export async function mockPublishSchema(id: string): Promise<PublishedSchemaItem> {
  await delay()
  const schema = MOCK_SCHEMAS.get(id)
  if (!schema) throw new Error(`Schema not found: ${id}`)

  const published: PublishedSchemaItem = {
    id: genId(),
    sourceId: id,
    name: schema.name,
    type: schema.type,
    json: schema.json ?? [],
    publishId: genId(),
    version: schema.version ?? '20250101000000',
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  MOCK_PUBLISHED.set(id, published)
  return { ...published }
}

export async function mockFetchPublishedSchema(sourceId: string): Promise<PublishedSchemaItem | null> {
  await delay()
  // 404 is normal — schema not yet published
  return MOCK_PUBLISHED.get(sourceId) ?? null
}
