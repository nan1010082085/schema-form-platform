import Router from '@koa/router'
import { v4 as uuidv4, validate as uuidValidate } from 'uuid'
import { FlowDefinitionModel } from '../models/FlowDefinition.js'
import { FlowVersionModel } from '../models/FlowVersion.js'
import { FlowInstanceModel } from '../models/FlowInstance.js'
import { TaskInstanceModel } from '../models/TaskInstance.js'
import { authMiddleware } from '../../../../server/src/middleware/auth.js'
import { validate } from '../../../../server/src/middleware/validate.js'
import { createFlowSchema, updateFlowSchema } from '../schemas/flowSchemas.js'

const requireAuth = authMiddleware({ required: true })

const router = new Router({ prefix: '/api/flows' })

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// GET /api/flows
router.get('/', async (ctx) => {
  const { search, status, page: pageStr = '1', pageSize: pageSizeStr = '20' } = ctx.query
  const page = Math.max(1, parseInt(pageStr as string, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr as string, 10) || 20))
  const skip = (page - 1) * pageSize

  const filter: Record<string, unknown> = {}
  if (search) filter.name = { $regex: escapeRegex(search as string), $options: 'i' }
  if (status && ['draft', 'published', 'archived'].includes(status as string)) {
    filter.status = status
  }

  const [items, total] = await Promise.all([
    FlowDefinitionModel.find(filter).skip(skip).limit(pageSize).sort({ updatedAt: -1 }),
    FlowDefinitionModel.countDocuments(filter),
  ])

  ctx.body = {
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  }
})

// POST /api/flows
router.post('/', requireAuth, validate(createFlowSchema), async (ctx) => {
  const { name, description, category } = ctx.request.body as {
    name: string
    description?: string
    category?: string
  }

  const definition = await FlowDefinitionModel.create({
    _id: uuidv4(),
    name: name.trim(),
    description: description ?? '',
    category: category ?? '',
    status: 'draft',
    createdBy: (ctx.state.user as { id: string }).id,
  })

  ctx.status = 201
  ctx.body = { success: true, data: definition }
})

// GET /api/flows/:id
router.get('/:id', async (ctx) => {
  const { id } = ctx.params
  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const definition = await FlowDefinitionModel.findById(id)
  if (!definition) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Flow definition not found.' } }
    return
  }

  ctx.body = { success: true, data: definition }
})

// PUT /api/flows/:id
router.put('/:id', requireAuth, validate(updateFlowSchema), async (ctx) => {
  const { id } = ctx.params
  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const existing = await FlowDefinitionModel.findById(id)
  if (!existing) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Flow definition not found.' } }
    return
  }

  const data: Record<string, unknown> = {}
  const { name, description, category } = ctx.request.body as {
    name?: string
    description?: string
    category?: string
  }
  if (name !== undefined) data.name = name.trim()
  if (description !== undefined) data.description = description
  if (category !== undefined) data.category = category

  if (Object.keys(data).length === 0) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'No fields to update.' } }
    return
  }

  const definition = await FlowDefinitionModel.findByIdAndUpdate(id, data, { new: true })
  ctx.body = { success: true, data: definition }
})

// DELETE /api/flows/:id
router.delete('/:id', requireAuth, async (ctx) => {
  const { id } = ctx.params
  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const existing = await FlowDefinitionModel.findById(id)
  if (!existing) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Flow definition not found.' } }
    return
  }

  await FlowVersionModel.deleteMany({ definitionId: id })
  await FlowInstanceModel.deleteMany({ definitionId: id })
  await TaskInstanceModel.deleteMany({ instanceId: { $in: [] } })
  await FlowDefinitionModel.findByIdAndDelete(id)

  ctx.status = 200
  ctx.body = { success: true, data: null }
})

// POST /api/flows/:id/publish
router.post('/:id/publish', requireAuth, async (ctx) => {
  const { id } = ctx.params
  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const definition = await FlowDefinitionModel.findById(id)
  if (!definition) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Flow definition not found.' } }
    return
  }

  const latestVersion = await FlowVersionModel.findOne({ definitionId: id }).sort({ version: -1 })
  if (!latestVersion) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'No versions to publish. Save a version first.' } }
    return
  }

  definition.status = 'published'
  definition.currentVersionId = latestVersion._id
  await definition.save()

  ctx.body = { success: true, data: definition }
})

export default router
