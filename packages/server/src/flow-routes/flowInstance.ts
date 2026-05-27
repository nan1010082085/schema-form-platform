import Router from '@koa/router'
import { validate as uuidValidate } from 'uuid'
import { FlowInstanceModel } from '../flow-models/FlowInstance.js'
import { authMiddleware } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { startInstanceSchema } from '../flow-schemas/instanceSchemas.js'
import { flowEngine } from '../flow-services/FlowEngine.js'

const requireAuth = authMiddleware({ required: true })

const router = new Router({ prefix: '/api/flow-instances' })

// GET /api/flow-instances
router.get('/', requireAuth, async (ctx) => {
  const { definitionId, status, page: pageStr = '1', pageSize: pageSizeStr = '20' } = ctx.query
  const page = Math.max(1, parseInt(pageStr as string, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr as string, 10) || 20))
  const skip = (page - 1) * pageSize

  const filter: Record<string, unknown> = {}
  if (definitionId && uuidValidate(definitionId as string)) filter.definitionId = definitionId
  if (
    status &&
    ['running', 'completed', 'terminated', 'suspended', 'failed'].includes(status as string)
  ) {
    filter.status = status
  }

  const [items, total] = await Promise.all([
    FlowInstanceModel.find(filter).skip(skip).limit(pageSize).sort({ createdAt: -1 }),
    FlowInstanceModel.countDocuments(filter),
  ])

  ctx.body = {
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  }
})

// POST /api/flow-instances
router.post('/', requireAuth, validate(startInstanceSchema), async (ctx) => {
  const { definitionId, variables } = ctx.request.body as {
    definitionId: string
    variables?: Record<string, unknown>
  }

  const userId = (ctx.state.user as { id: string }).id
  const instance = await flowEngine.startFlow(definitionId, variables ?? {}, userId)

  ctx.status = 201
  ctx.body = { success: true, data: instance }
})

// GET /api/flow-instances/:id
router.get('/:id', requireAuth, async (ctx) => {
  const { id } = ctx.params
  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const instance = await FlowInstanceModel.findById(id)
  if (!instance) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Instance not found.' } }
    return
  }

  ctx.body = { success: true, data: instance }
})

// POST /api/flow-instances/:id/terminate
router.post('/:id/terminate', requireAuth, async (ctx) => {
  const { id } = ctx.params
  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  await flowEngine.terminateInstance(id)
  const instance = await FlowInstanceModel.findById(id)
  ctx.body = { success: true, data: instance }
})

// POST /api/flow-instances/:id/suspend
router.post('/:id/suspend', requireAuth, async (ctx) => {
  const { id } = ctx.params
  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  await flowEngine.suspendInstance(id)
  const instance = await FlowInstanceModel.findById(id)
  ctx.body = { success: true, data: instance }
})

// POST /api/flow-instances/:id/resume
router.post('/:id/resume', requireAuth, async (ctx) => {
  const { id } = ctx.params
  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  await flowEngine.resumeInstance(id)
  const instance = await FlowInstanceModel.findById(id)
  ctx.body = { success: true, data: instance }
})

export default router
