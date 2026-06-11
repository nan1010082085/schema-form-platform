import Router from '@koa/router'
import { v4 as uuidv4, validate as uuidValidate } from 'uuid'
import { WorkflowModel } from '../models/Workflow.js'
import { FormSchemaModel } from '../models/FormSchema.js'
import { PublishedSchemaModel } from '../models/PublishedSchema.js'
import { FormSubmissionModel } from '../models/FormSubmission.js'
import { FlowDefinitionModel } from '../flow-models/FlowDefinition.js'
import { authMiddleware, type JwtPayload } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createWorkflowSchema, updateWorkflowSchema, startWorkflowSchema } from '../schemas/workflowSchemas.js'
import { flowEngine } from '../flow-services/FlowEngine.js'
import type { WorkflowStatus } from '../models/Workflow.js'

const requireAuth = authMiddleware({ required: true })

const router = new Router({ prefix: '/api/workflows' })

// ────────────────────────────────────────────
// POST /api/workflows
// 创建 Workflow
// ────────────────────────────────────────────
router.post('/', requireAuth, validate(createWorkflowSchema), async (ctx) => {
  const body = ctx.request.body as {
    name: string
    description?: string
    formSchemaId: string
    flowDefinitionId: string
    dataUpdateRules?: Array<{ trigger: string; targetField: string; sourceField: string; transform?: string }>
    publishConfig?: { entryUrl?: string; permissions?: { launchers?: string[]; viewers?: string[] } }
  }

  // 验证关联的 formSchema 存在
  const schema = await FormSchemaModel.findById(body.formSchemaId)
  if (!schema) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Form schema not found.' } }
    return
  }

  // 验证关联的 flowDefinition 存在
  const flowDef = await FlowDefinitionModel.findById(body.flowDefinitionId)
  if (!flowDef) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Flow definition not found.' } }
    return
  }

  const userId = (ctx.state.user as JwtPayload).id

  const workflow = await WorkflowModel.create({
    _id: uuidv4(),
    name: body.name,
    description: body.description ?? '',
    status: 'draft',
    formSchemaId: body.formSchemaId,
    flowDefinitionId: body.flowDefinitionId,
    dataUpdateRules: body.dataUpdateRules ?? [],
    publishConfig: body.publishConfig ?? {},
    createdBy: userId,
  })

  ctx.status = 201
  ctx.body = { success: true, data: workflow }
})

// ────────────────────────────────────────────
// GET /api/workflows
// 列表（分页、按 status 筛选）
// ────────────────────────────────────────────
router.get('/', requireAuth, async (ctx) => {
  const { status, search, page: pageStr = '1', pageSize: pageSizeStr = '20' } = ctx.query

  const page = Math.max(1, parseInt(pageStr as string, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr as string, 10) || 20))
  const skip = (page - 1) * pageSize

  const filter: Record<string, unknown> = {}
  if (status && ['draft', 'published', 'archived'].includes(status as string)) {
    filter.status = status as WorkflowStatus
  }
  if (search && typeof search === 'string' && search.trim()) {
    filter.name = { $regex: search.trim(), $options: 'i' }
  }

  const [items, total] = await Promise.all([
    WorkflowModel.find(filter).skip(skip).limit(pageSize).sort({ createdAt: -1 }),
    WorkflowModel.countDocuments(filter),
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
// GET /api/workflows/:id
// 详情
// ────────────────────────────────────────────
router.get('/:id', requireAuth, async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const workflow = await WorkflowModel.findById(id)
  if (!workflow) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Workflow not found.' } }
    return
  }

  ctx.body = { success: true, data: workflow }
})

// ────────────────────────────────────────────
// PUT /api/workflows/:id
// 更新
// ────────────────────────────────────────────
router.put('/:id', requireAuth, validate(updateWorkflowSchema), async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const body = ctx.request.body as Record<string, unknown>

  // 如果更新了 formSchemaId，验证存在
  if (body.formSchemaId) {
    const schema = await FormSchemaModel.findById(body.formSchemaId as string)
    if (!schema) {
      ctx.status = 404
      ctx.body = { success: false, error: { message: 'Form schema not found.' } }
      return
    }
  }

  // 如果更新了 flowDefinitionId，验证存在
  if (body.flowDefinitionId) {
    const flowDef = await FlowDefinitionModel.findById(body.flowDefinitionId as string)
    if (!flowDef) {
      ctx.status = 404
      ctx.body = { success: false, error: { message: 'Flow definition not found.' } }
      return
    }
  }

  // 不允许直接通过 PUT 修改 status
  delete body.status

  const workflow = await WorkflowModel.findByIdAndUpdate(id, { $set: body }, { new: true })
  if (!workflow) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Workflow not found.' } }
    return
  }

  ctx.body = { success: true, data: workflow }
})

// ────────────────────────────────────────────
// DELETE /api/workflows/:id
// 删除
// ────────────────────────────────────────────
router.delete('/:id', requireAuth, async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const result = await WorkflowModel.findByIdAndDelete(id)
  if (!result) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Workflow not found.' } }
    return
  }

  ctx.status = 200
  ctx.body = { success: true, data: null }
})

// ────────────────────────────────────────────
// POST /api/workflows/:id/duplicate
// 复制 Workflow（新名称，状态重置为 draft）
// ────────────────────────────────────────────
router.post('/:id/duplicate', requireAuth, async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const source = await WorkflowModel.findById(id)
  if (!source) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Workflow not found.' } }
    return
  }

  const userId = (ctx.state.user as JwtPayload).id

  const duplicate = await WorkflowModel.create({
    _id: uuidv4(),
    name: `${source.name}（副本）`,
    description: source.description,
    status: 'draft',
    formSchemaId: source.formSchemaId,
    flowDefinitionId: source.flowDefinitionId,
    dataUpdateRules: source.dataUpdateRules.map((r: { trigger: string; targetField: string; sourceField: string; transform?: string }) => ({ ...r })),
    publishConfig: { entryUrl: '', permissions: { launchers: [], viewers: [] } },
    createdBy: userId,
  })

  ctx.status = 201
  ctx.body = { success: true, data: duplicate }
})

// ────────────────────────────────────────────
// POST /api/workflows/:id/publish
// 发布（status 改为 published），自动生成 API endpoint
// ────────────────────────────────────────────
router.post('/:id/publish', requireAuth, async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const workflow = await WorkflowModel.findById(id)
  if (!workflow) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Workflow not found.' } }
    return
  }

  if (workflow.status === 'published') {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Workflow is already published.' } }
    return
  }

  // Auto-generate API endpoint URL on publish
  const baseUrl = process.env.API_BASE_URL ?? `${ctx.origin}`
  const entryUrl = `${baseUrl}/api/workflows/${id}/instances`

  workflow.status = 'published'
  workflow.publishConfig = {
    ...workflow.publishConfig,
    entryUrl,
  }
  await workflow.save()

  ctx.body = { success: true, data: workflow }
})

// ────────────────────────────────────────────
// POST /api/workflows/:id/start
// 发起流程实例（创建 FormSubmission + 启动 FlowInstance）
// ────────────────────────────────────────────
router.post('/:id/start', requireAuth, validate(startWorkflowSchema), async (ctx) => {
  const { id } = ctx.params
  const body = ctx.request.body as { data: Record<string, unknown>; variables?: Record<string, unknown> }

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const workflow = await WorkflowModel.findById(id)
  if (!workflow) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Workflow not found.' } }
    return
  }

  if (workflow.status !== 'published') {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Only published workflows can be started.' } }
    return
  }

  const userId = (ctx.state.user as JwtPayload).id

  // 1. 创建 FormSubmission
  const submission = await FormSubmissionModel.create({
    _id: uuidv4(),
    schemaId: workflow.formSchemaId,
    data: body.data,
    submitterId: userId,
    status: 'submitted',
  })

  // 2. 启动 FlowInstance，将 submissionId 注入变量
  const variables: Record<string, unknown> = {
    ...body.variables,
    submissionId: submission._id,
    formSchemaId: workflow.formSchemaId,
  }

  const instance = await flowEngine.startFlow(
    workflow.flowDefinitionId,
    variables,
    userId,
  )

  ctx.status = 201
  ctx.body = {
    success: true,
    data: {
      submission,
      instance,
    },
  }
})

export default router
