import Router from '@koa/router'
import { v4 as uuidv4, validate as uuidValidate } from 'uuid'
import { WorkflowModel } from '../models/Workflow.js'
import { FormSubmissionModel } from '../models/FormSubmission.js'
import { FlowInstanceModel } from '../flow-models/FlowInstance.js'
import { flowEngine } from '../flow-services/FlowEngine.js'
import { apiOrJwtAuthMiddleware } from '../middleware/apiOrJwtAuth.js'

const apiOrJwtAuth = apiOrJwtAuthMiddleware()

const router = new Router({ prefix: '/api/workflows' })

// ────────────────────────────────────────────
// POST /api/workflows/:id/instances
// 启动流程实例（公开 API，支持 API Key 或 JWT 认证）
// ────────────────────────────────────────────
router.post('/:id/instances', apiOrJwtAuth, async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid workflow ID format.' } }
    return
  }

  const body = ctx.request.body as { variables?: Record<string, unknown> }

  const workflow = await WorkflowModel.findById(id)
  if (!workflow) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Workflow not found.' } }
    return
  }

  if (workflow.status !== 'published') {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Only published workflows can be started via API.' } }
    return
  }

  const auth = ctx.state.auth as { userId: string; tenantId: string }

  // Create a FormSubmission as the data container
  const submission = await FormSubmissionModel.create({
    _id: uuidv4(),
    schemaId: workflow.formSchemaId,
    data: body.variables ?? {},
    submitterId: auth.userId,
    status: 'submitted',
  })

  // Start flow instance with submissionId injected into variables
  const variables: Record<string, unknown> = {
    ...body.variables,
    submissionId: submission._id,
    formSchemaId: workflow.formSchemaId,
  }

  const instance = await flowEngine.startFlow(
    workflow.flowDefinitionId,
    variables,
    auth.userId,
  )

  ctx.status = 201
  ctx.body = {
    success: true,
    data: {
      instanceId: instance!._id,
      status: instance!.status,
    },
  }
})

export default router
