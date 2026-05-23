import Router from '@koa/router'
import { v4 as uuidv4, validate as uuidValidate } from 'uuid'
import { FormSchemaModel } from '../models/FormSchema.js'
import { PublishedSchemaModel } from '../models/PublishedSchema.js'
import { authMiddleware } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createSchemaSchema, updateSchemaSchema, importSchemaSchema } from '../schemas/schemaSchemas.js'

const requireAuth = authMiddleware({ required: true })

const router = new Router({ prefix: '/api/schemas' })

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Generate a version timestamp string in yyyymmddhhmmss format.
 */
function generateVersion(): string {
  const now = new Date()
  const pad = (n: number, len: number) => String(n).padStart(len, '0')
  return (
    pad(now.getFullYear(), 4) +
    pad(now.getMonth() + 1, 2) +
    pad(now.getDate(), 2) +
    pad(now.getHours(), 2) +
    pad(now.getMinutes(), 2) +
    pad(now.getSeconds(), 2)
  )
}

/**
 * Valid widget types for import validation.
 */
const VALID_WIDGET_TYPES = new Set([
  'form', 'card', 'row-col', 'tabs', 'dialog',
  'input', 'number', 'select', 'radio', 'checkbox',
  'date', 'date-range', 'textarea', 'richtext',
  'button', 'button-list', 'upload', 'table',
  'search-list', 'editable-table', 'title', 'divider',
  'spacer', 'toolbar-buttons', 'file-list', 'transfer',
  'detail-form', 'banner', 'tree-layout', 'date-time-slot',
  'grid-row', 'grid-col', 'page', 'toolbar', 'pagination', 'steps',
])

interface WidgetNode {
  type?: string
  id?: string
  children?: WidgetNode[]
  [key: string]: unknown
}

interface ValidationError {
  path: string
  message: string
}

/**
 * Walk the json tree and validate that every widget has a valid type.
 * Also collect validation errors.
 */
function validateWidgetTree(nodes: WidgetNode[], errors: ValidationError[], prefix = ''): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const path = prefix ? `${prefix}[${i}]` : `[${i}]`

    if (!node.type) {
      errors.push({ path: `${path}.type`, message: 'Widget is missing required "type" field.' })
    } else if (!VALID_WIDGET_TYPES.has(node.type)) {
      errors.push({ path: `${path}.type`, message: `Invalid widget type "${node.type}".` })
    }

    if (node.children && Array.isArray(node.children)) {
      validateWidgetTree(node.children, errors, path)
    }
  }
}

/**
 * Walk the json tree and regenerate all `id` fields with new UUIDs.
 */
function regenerateIds(nodes: WidgetNode[]): void {
  for (const node of nodes) {
    node.id = uuidv4()
    if (node.children && Array.isArray(node.children)) {
      regenerateIds(node.children)
    }
  }
}

/**
 * Check if a string is a valid UUID.
 */
function isUUID(str: string): boolean {
  return uuidValidate(str)
}

// ────────────────────────────────────────────
// GET /api/schemas
// Lists draft schemas with optional filters.
// ────────────────────────────────────────────
router.get('/', async (ctx) => {
  const { search, type, page: pageStr = '1', pageSize: pageSizeStr = '20' } = ctx.query
  const page = Math.max(1, parseInt(pageStr as string, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr as string, 10) || 20))
  const skip = (page - 1) * pageSize

  const filter: Record<string, unknown> = {}
  if (search) filter.name = { $regex: escapeRegex(search as string), $options: 'i' }
  if (type && ['form', 'search_list'].includes(type as string)) filter.type = type as string

  const [items, total] = await Promise.all([
    FormSchemaModel.find(filter).skip(skip).limit(pageSize).sort({ updatedAt: -1 }),
    FormSchemaModel.countDocuments(filter),
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

// ────────────────────────────────────────────
// POST /api/schemas
// Create a new schema or a new version of an existing schema.
// If body has `editId`, find existing schema by editId, generate new version,
// create new document with same editId. Otherwise generate new editId + version.
// ────────────────────────────────────────────
router.post('/', requireAuth, validate(createSchemaSchema), async (ctx) => {
  const { name, json, type, editId: bodyEditId } = ctx.request.body as {
    name?: string; json?: unknown; type?: string; editId?: string
  }

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
  const version = generateVersion()
  const newEditId = bodyEditId || uuidv4()

  const schema = await FormSchemaModel.create({
    _id: uuidv4(),
    editId: newEditId,
    version,
    name: name.trim(),
    type: schemaType,
    json: json as object,
  })

  ctx.status = 201
  ctx.body = { success: true, data: schema }
})

// ────────────────────────────────────────────
// POST /api/schemas/import
// Import a schema with deep validation.
// ────────────────────────────────────────────
router.post('/import', requireAuth, validate(importSchemaSchema), async (ctx) => {
  const { name, type, json } = ctx.request.body as {
    name?: string; type?: string; json?: unknown
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Field "name" is required and must be a non-empty string.' } }
    return
  }

  if (!json || !Array.isArray(json)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Field "json" is required and must be an array.' } }
    return
  }

  // Validate widget tree
  const validationErrors: ValidationError[] = []
  validateWidgetTree(json as WidgetNode[], validationErrors)

  if (validationErrors.length > 0) {
    ctx.status = 400
    ctx.body = {
      success: false,
      error: {
        message: 'Import validation failed.',
        details: validationErrors,
      },
    }
    return
  }

  // Regenerate all IDs
  regenerateIds(json as WidgetNode[])

  const schemaType = (type === 'search-list' || type === 'search_list') ? 'search_list' : 'form'
  const editId = uuidv4()
  const version = generateVersion()

  const schema = await FormSchemaModel.create({
    _id: uuidv4(),
    editId,
    version,
    name: name.trim(),
    type: schemaType,
    json: json as object,
  })

  ctx.status = 201
  ctx.body = { success: true, data: schema }
})

// ────────────────────────────────────────────
// GET /api/schemas/published/:sourceId
// Reads published schema by source FormSchema ID.
// ────────────────────────────────────────────
router.get('/published/:sourceId', async (ctx) => {
  const { sourceId } = ctx.params

  if (!uuidValidate(sourceId)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const published = await PublishedSchemaModel.findOne({ sourceId })

  if (!published) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Published schema not found.' } }
    return
  }

  ctx.body = { success: true, data: published }
})

// ────────────────────────────────────────────
// GET /api/schemas/:editId/versions
// Query FormSchema by editId, sort by version desc.
// Must be registered before GET /:id to avoid param collision.
// ────────────────────────────────────────────
router.get('/:param/versions', async (ctx) => {
  const { param } = ctx.params
  const { page: pageStr = '1', pageSize: pageSizeStr = '20' } = ctx.query
  const page = Math.max(1, parseInt(pageStr as string, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr as string, 10) || 20))
  const skip = (page - 1) * pageSize

  // If param is a UUID, it's being used as an editId (from /:id/versions pattern)
  // If param is not a UUID, also treat as editId
  const editId = param

  const [versions, total] = await Promise.all([
    FormSchemaModel.find({ editId }).sort({ version: -1 }).skip(skip).limit(pageSize),
    FormSchemaModel.countDocuments({ editId }),
  ])

  if (total === 0) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'No versions found for this editId.' } }
    return
  }

  // Get published version to mark which version is published
  const published = await PublishedSchemaModel.findOne({ sourceId: editId })

  const items = versions.map((v) => ({
    id: v._id,
    version: v.version,
    createdAt: v.createdAt,
    published: published ? published.version === v.version : false,
  }))

  ctx.body = {
    success: true,
    data: {
      items,
      total,
    },
  }
})

// ────────────────────────────────────────────
// GET /api/schemas/:editId/versions/:version
// Query by editId + version, return full schema.
// ────────────────────────────────────────────
router.get('/:param/versions/:version', async (ctx) => {
  const { param, version } = ctx.params

  const schema = await FormSchemaModel.findOne({ editId: param, version })

  if (!schema) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Schema version not found.' } }
    return
  }

  ctx.body = { success: true, data: schema }
})

// ────────────────────────────────────────────
// GET /api/schemas/:id
// ────────────────────────────────────────────
router.get('/:id', async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const schema = await FormSchemaModel.findById(id)

  if (!schema) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Schema not found.' } }
    return
  }

  ctx.body = { success: true, data: schema }
})

// ────────────────────────────────────────────
// PUT /api/schemas/:id
// ────────────────────────────────────────────
router.put('/:id', requireAuth, validate(updateSchemaSchema), async (ctx) => {
  const { id } = ctx.params
  const { name, json, status, type } = ctx.request.body as {
    name?: string; json?: unknown; status?: string; type?: string
  }

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const existing = await FormSchemaModel.findById(id)
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
    if (status !== 'draft') {
      ctx.status = 400
      ctx.body = { success: false, error: { message: 'Cannot change status to "published". Use POST /:id/publish to publish a schema.' } }
      return
    }
    data.status = status
  }
  if (type !== undefined) {
    if (!['form', 'search_list'].includes(type as string)) {
      ctx.status = 400
      ctx.body = { success: false, error: { message: 'Field "type" must be "form" or "search_list".' } }
      return
    }
    data.type = type
  }

  if (Object.keys(data).length === 0) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'No fields to update. Provide name, json, and/or type.' } }
    return
  }

  const schema = await FormSchemaModel.findByIdAndUpdate(id, data, { new: true })

  ctx.body = { success: true, data: schema }
})

// ────────────────────────────────────────────
// POST /api/schemas/:id/publish
// Publishes a schema. Accepts optional `version` in body.
// If provided, find the schema by editId+version and publish that.
// Otherwise publish the `:id` document.
// ────────────────────────────────────────────
router.post('/:id/publish', requireAuth, async (ctx) => {
  const { id } = ctx.params
  const { version: bodyVersion } = ctx.request.body as { version?: string }

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  let draft = await FormSchemaModel.findById(id)
  if (!draft) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Schema not found.' } }
    return
  }

  // If a specific version is requested, find that version by editId
  if (bodyVersion) {
    const versioned = await FormSchemaModel.findOne({ editId: draft.editId, version: bodyVersion })
    if (!versioned) {
      ctx.status = 404
      ctx.body = { success: false, error: { message: `Schema version "${bodyVersion}" not found.` } }
      return
    }
    draft = versioned
  }

  const now = new Date()
  const newPublishId = uuidv4()

  const published = await PublishedSchemaModel.findOneAndUpdate(
    { sourceId: draft.editId },
    {
      $set: {
        name: draft.name,
        type: draft.type,
        json: draft.json,
        publishId: newPublishId,
        version: draft.version,
        publishedAt: now,
      },
      $setOnInsert: {
        _id: uuidv4(),
        sourceId: draft.editId,
      },
    },
    { upsert: true, new: true, runValidators: true },
  )

  ctx.body = { success: true, data: published }
})

// ────────────────────────────────────────────
// DELETE /api/schemas/:id
// ────────────────────────────────────────────
router.delete('/:id', requireAuth, async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const existing = await FormSchemaModel.findById(id)
  if (!existing) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Schema not found.' } }
    return
  }

  // Also remove any published version for this schema's editId
  await PublishedSchemaModel.deleteOne({ sourceId: existing.editId })
  await FormSchemaModel.findByIdAndDelete(id)

  ctx.status = 200
  ctx.body = { success: true, data: null }
})

export default router
