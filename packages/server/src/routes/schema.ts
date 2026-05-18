import Router from '@koa/router'
import { v4 as uuidv4, validate as uuidValidate } from 'uuid'
import { prisma } from '../config/database.js'

const router = new Router({ prefix: '/api/schemas' })

/**
 * GET /api/schemas
 * List all schemas with optional search by name.
 * Query params: ?search=&page=1&pageSize=20
 */
router.get('/', async (ctx) => {
  const { search, type, status, publishId, page: pageStr = '1', pageSize: pageSizeStr = '20' } = ctx.query
  const page = Math.max(1, parseInt(pageStr as string, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr as string, 10) || 20))
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}
  if (search) where.name = { contains: search as string, mode: 'insensitive' as const }
  if (type && ['form', 'search_list'].includes(type as string)) where.type = type as string
  if (status && ['draft', 'published'].includes(status as string)) where.status = status as string
  if (publishId) where.publishId = publishId as string

  const [items, total] = await Promise.all([
    prisma.formSchema.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.formSchema.count({ where }),
  ])

  ctx.body = {
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})

/**
 * POST /api/schemas
 * Create a new schema.
 * Body: { name: string, json: object }
 */
router.post('/', async (ctx) => {
  const { name, json, type } = ctx.request.body as { name?: string; json?: unknown; type?: string }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Field "name" is required and must be a non-empty string.' } }
    return
  }

  if (json === undefined || json === null) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Field "json" is required.' } }
    return
  }

  const schemaType = (type === 'search-list' || type === 'search_list') ? 'search_list' : 'form'

  const schema = await prisma.formSchema.create({
    data: {
      id: uuidv4(),
      name: name.trim(),
      type: schemaType,
      json: json as object,
    },
  })

  ctx.status = 201
  ctx.body = { success: true, data: schema }
})

/**
 * GET /api/schemas/:id
 * Get a single schema by ID.
 */
router.get('/:id', async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const schema = await prisma.formSchema.findUnique({ where: { id } })

  if (!schema) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Schema not found.' } }
    return
  }

  ctx.body = { success: true, data: schema }
})

/**
 * PUT /api/schemas/:id
 * Update a schema by ID.
 * Body: { name?: string, json?: object }
 */
router.put('/:id', async (ctx) => {
  const { id } = ctx.params
  const { name, json, status, type } = ctx.request.body as {
    name?: string; json?: unknown; status?: string; type?: string
  }

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const existing = await prisma.formSchema.findUnique({ where: { id } })
  if (!existing) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Schema not found.' } }
    return
  }

  const data: Record<string, unknown> = {}
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      ctx.status = 400
      ctx.body = { success: false, error: { message: 'Field "name" must be a non-empty string.' } }
      return
    }
    data.name = name.trim()
  }
  if (json !== undefined) {
    if (json === null) {
      ctx.status = 400
      ctx.body = { success: false, error: { message: 'Field "json" cannot be null.' } }
      return
    }
    data.json = json
  }
  if (status !== undefined) {
    if (!['draft', 'published'].includes(status)) {
      ctx.status = 400
      ctx.body = { success: false, error: { message: 'Field "status" must be "draft" or "published".' } }
      return
    }
    data.status = status
    if (status === 'published') {
      // 首次发布生成 publishId，后续复用
      if (!existing.publishId) {
        data.publishId = uuidv4()
      }
      data.publishedAt = new Date()
    }
  }
  if (type !== undefined) {
    if (!['form', 'search_list'].includes(type)) {
      ctx.status = 400
      ctx.body = { success: false, error: { message: 'Field "type" must be "form" or "search_list".' } }
      return
    }
    data.type = type
  }

  if (Object.keys(data).length === 0) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'No fields to update. Provide name, json, status, and/or type.' } }
    return
  }

  const schema = await prisma.formSchema.update({
    where: { id },
    data: data as never,
  })

  ctx.body = { success: true, data: schema }
})

/**
 * DELETE /api/schemas/:id
 * Delete a schema by ID.
 */
router.delete('/:id', async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const existing = await prisma.formSchema.findUnique({ where: { id } })
  if (!existing) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Schema not found.' } }
    return
  }

  await prisma.formSchema.delete({ where: { id } })

  ctx.status = 200
  ctx.body = { success: true, data: null }
})

export default router
