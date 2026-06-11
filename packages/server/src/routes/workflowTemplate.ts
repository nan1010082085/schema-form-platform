import Router from '@koa/router'
import { v4 as uuidv4, validate as uuidValidate } from 'uuid'
import { WorkflowTemplateModel } from '../models/WorkflowTemplate.js'
import { WorkflowModel } from '../models/Workflow.js'
import { FormSchemaModel } from '../models/FormSchema.js'
import { FlowDefinitionModel } from '../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../flow-models/FlowVersion.js'
import { PublishedSchemaModel } from '../models/PublishedSchema.js'
import { authMiddleware, type JwtPayload } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { applyWorkflowTemplateSchema } from '../schemas/workflowTemplateSchemas.js'
import { BUILTIN_WORKFLOW_TEMPLATES } from '../workflow/templates/index.js'

const requireAuth = authMiddleware({ required: true })

const router = new Router({ prefix: '/api/workflow-templates' })

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ────────────────────────────────────────────
// GET /api/workflow-templates
// Lists templates with optional search/category filters and pagination.
// ────────────────────────────────────────────
router.get('/', async (ctx) => {
  const {
    search,
    category,
    isBuiltin,
    page: pageStr = '1',
    pageSize: pageSizeStr = '20',
  } = ctx.query

  const page = Math.max(1, parseInt(pageStr as string, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr as string, 10) || 20))
  const skip = (page - 1) * pageSize

  const filter: Record<string, unknown> = {}

  if (search) {
    filter.$or = [
      { name: { $regex: escapeRegex(search as string), $options: 'i' } },
      { description: { $regex: escapeRegex(search as string), $options: 'i' } },
    ]
  }

  if (category) {
    filter.category = category
  }

  if (isBuiltin !== undefined) {
    filter.isBuiltin = isBuiltin === 'true'
  }

  const [items, total] = await Promise.all([
    WorkflowTemplateModel.find(filter).skip(skip).limit(pageSize).sort({ isBuiltin: -1, useCount: -1, createdAt: -1 }),
    WorkflowTemplateModel.countDocuments(filter),
  ])

  ctx.body = {
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  }
})

// ────────────────────────────────────────────
// GET /api/workflow-templates/:id
// Get a single template by ID.
// ────────────────────────────────────────────
router.get('/:id', async (ctx) => {
  const { id } = ctx.params

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const template = await WorkflowTemplateModel.findById(id)

  if (!template) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Workflow template not found.' } }
    return
  }

  ctx.body = { success: true, data: template }
})

// ────────────────────────────────────────────
// POST /api/workflow-templates/:id/use
// Use a template to create a complete Workflow (FormSchema + FlowDefinition + Workflow).
// ────────────────────────────────────────────
router.post('/:id/use', requireAuth, validate(applyWorkflowTemplateSchema), async (ctx) => {
  const { id } = ctx.params
  const { name, description } = ctx.request.body as { name?: string; description?: string }

  if (!uuidValidate(id)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Invalid UUID format.' } }
    return
  }

  const template = await WorkflowTemplateModel.findById(id)
  if (!template) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Workflow template not found.' } }
    return
  }

  const userId = (ctx.state.user as JwtPayload).id

  // 1. Create FormSchema from template
  const formSchemaId = uuidv4()
  const formEditId = uuidv4()
  const now = new Date()
  const pad = (n: number, len: number) => String(n).padStart(len, '0')
  const version = pad(now.getFullYear(), 4) + pad(now.getMonth() + 1, 2) + pad(now.getDate(), 2) + pad(now.getHours(), 2) + pad(now.getMinutes(), 2) + pad(now.getSeconds(), 2)

  const formSchema = await FormSchemaModel.create({
    _id: formSchemaId,
    editId: formEditId,
    version,
    name: `${name ?? template.name} - 表单`,
    type: 'form',
    json: template.formSchema,
    createdBy: userId,
  })

  // 2. Create FlowDefinition + FlowVersion from template
  const definitionId = uuidv4()
  const versionId = uuidv4()

  // Regenerate node and edge IDs to avoid collisions
  const idMap = new Map<string, string>()
  const nodes = template.flowDefinition.nodes.map((node: Record<string, unknown>) => {
    const newId = uuidv4()
    idMap.set(node.id as string, newId)
    return { ...node, id: newId }
  })
  const edges = template.flowDefinition.edges.map((edge: Record<string, unknown>) => ({
    ...edge,
    id: uuidv4(),
    source: { ...(edge.source as Record<string, unknown>), cell: idMap.get((edge.source as Record<string, unknown>).cell as string) ?? (edge.source as Record<string, unknown>).cell },
    target: { ...(edge.target as Record<string, unknown>), cell: idMap.get((edge.target as Record<string, unknown>).cell as string) ?? (edge.target as Record<string, unknown>).cell },
  }))

  const nextVersion = `v${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`

  const flowDefinition = await FlowDefinitionModel.create({
    _id: definitionId,
    name: `${name ?? template.name} - 流程`,
    description: description ?? template.description,
    category: template.category,
    status: 'draft',
    createdBy: userId,
    permissions: { editors: [], launchers: [], viewers: [] },
  })

  const flowVersion = await FlowVersionModel.create({
    _id: versionId,
    definitionId,
    version: nextVersion,
    graph: { nodes, edges },
    metadata: null,
  })

  flowDefinition.currentVersionId = flowVersion._id
  await flowDefinition.save()

  // 3. Create Workflow linking FormSchema + FlowDefinition
  const workflow = await WorkflowModel.create({
    _id: uuidv4(),
    name: name ?? template.name,
    description: description ?? template.description,
    status: 'draft',
    formSchemaId: formSchema._id,
    flowDefinitionId: definitionId,
    dataUpdateRules: template.dataUpdateRules ?? [],
    createdBy: userId,
  })

  // 4. Increment template use count
  await WorkflowTemplateModel.findByIdAndUpdate(id, { $inc: { useCount: 1 } })

  ctx.status = 201
  ctx.body = {
    success: true,
    data: {
      workflow,
      formSchema: { id: formSchema._id, name: formSchema.name },
      flowDefinition: { id: flowDefinition._id, name: flowDefinition.name },
    },
  }
})

// ────────────────────────────────────────────
// POST /api/workflow-templates/seed
// Seed built-in templates (idempotent — skips if name already exists).
// ────────────────────────────────────────────
router.post('/seed', requireAuth, async (ctx) => {
  const results = { created: 0, skipped: 0 }

  for (const tpl of BUILTIN_WORKFLOW_TEMPLATES) {
    const existing = await WorkflowTemplateModel.findOne({ name: tpl.name, isBuiltin: true })
    if (existing) {
      results.skipped++
      continue
    }
    await WorkflowTemplateModel.create({
      _id: uuidv4(),
      ...tpl,
      isBuiltin: true,
      createdBy: 'system',
    })
    results.created++
  }

  ctx.body = { success: true, data: results }
})

export default router
