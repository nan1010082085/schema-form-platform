import Router from '@koa/router'
import { validate as uuidValidate } from 'uuid'
import { FlowInstanceModel } from '../flow-models/FlowInstance.js'
import { FlowDefinitionModel } from '../flow-models/FlowDefinition.js'
import { authMiddleware } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { startInstanceSchema } from '../flow-schemas/instanceSchemas.js'
import { flowEngine } from '../flow-services/FlowEngine.js'
import { flowPermissionService } from '../flow-services/FlowPermissionService.js'

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

  // Batch-fetch flow definition names
  const definitionIds = [...new Set(items.map((i) => i.definitionId))]
  const definitions = await FlowDefinitionModel.find(
    { _id: { $in: definitionIds } },
    { name: 1 },
  )
  const nameMap = new Map(definitions.map((d) => [d._id, d.name]))

  const enriched = items.map((item) => ({
    ...item.toJSON(),
    definitionName: nameMap.get(item.definitionId) ?? null,
  }))

  ctx.body = {
    success: true,
    data: { items: enriched, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  }
})

// POST /api/flow-instances
router.post('/', requireAuth, validate(startInstanceSchema), async (ctx) => {
  const { definitionId, variables } = ctx.request.body as {
    definitionId: string
    variables?: Record<string, unknown>
  }

  const userId = (ctx.state.user as { id: string }).id

  const canLaunch = await flowPermissionService.checkLaunchPermission(userId, definitionId)
  if (!canLaunch) {
    ctx.status = 403
    ctx.body = { success: false, error: { message: 'You do not have permission to launch this flow.' } }
    return
  }

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
