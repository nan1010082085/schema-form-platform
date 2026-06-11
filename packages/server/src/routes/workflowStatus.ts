import Router from '@koa/router'
import { validate as uuidValidate } from 'uuid'
import { FlowInstanceModel } from '../flow-models/FlowInstance.js'
import { TaskInstanceModel } from '../flow-models/TaskInstance.js'
import { apiOrJwtAuthMiddleware } from '../middleware/apiOrJwtAuth.js'

const apiOrJwtAuth = apiOrJwtAuthMiddleware()

const router = new Router({ prefix: '/api/workflows' })

// ────────────────────────────────────────────
// GET /api/workflows/:id/instances/:instanceId
// 查询流程实例状态（公开 API，支持 API Key 或 JWT 认证）
// ────────────────────────────────────────────
router.get('/:id/instances/:instanceId', apiOrJwtAuth, async (ctx) => {
  const { id, instanceId } = ctx.params

  if (!uuidValidate(id) || !uuidValidate(instanceId)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid ID format.' } }
    return
  }

  const instance = await FlowInstanceModel.findById(instanceId)
  if (!instance) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Instance not found.' } }
    return
  }

  // Verify the instance belongs to the specified workflow (definitionId)
  if (instance.definitionId !== id) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Instance not found for this workflow.' } }
    return
  }

  // Find current active/waiting node info
  let currentNode: string | null = null
  const activeToken = instance.tokens.find(
    (t: { state: string }) => t.state === 'active' || t.state === 'waiting',
  )
  if (activeToken) {
    currentNode = activeToken.nodeId
  }

  ctx.body = {
    success: true,
    data: {
      instanceId: instance._id,
      status: instance.status,
      currentNode,
      completedAt: instance.completedAt ?? null,
    },
  }
})

export default router
