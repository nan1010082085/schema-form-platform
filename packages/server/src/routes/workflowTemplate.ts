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
import { BpmnElementType } from '@schema-form/flow-shared'

const requireAuth = authMiddleware({ required: true })

const router = new Router({ prefix: '/api/workflow-templates' })

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ────────────────────────────────────────────
// Flow graph builder helpers
// ────────────────────────────────────────────

interface FlowNodeData {
  id: string
  shape: string
  x: number
  y: number
  width: number
  height: number
  data: Record<string, unknown>
}

interface FlowEdgeData {
  id: string
  shape: string
  source: { cell: string }
  target: { cell: string }
  data: Record<string, unknown>
}

function makeStartNode(id: string, x: number, y: number): FlowNodeData {
  return { id, shape: 'bpmn-start-event', x, y, width: 40, height: 40, data: { bpmnType: BpmnElementType.StartEvent, label: '开始' } }
}

function makeEndNode(id: string, x: number, y: number): FlowNodeData {
  return { id, shape: 'bpmn-end-event', x, y, width: 40, height: 40, data: { bpmnType: BpmnElementType.EndEvent, label: '结束' } }
}

function makeUserTaskNode(id: string, label: string, x: number, y: number, assigneeType: 'user' | 'role' | 'expression' = 'user', assignee = ''): FlowNodeData {
  return { id, shape: 'bpmn-user-task', x, y, width: 180, height: 60, data: { bpmnType: BpmnElementType.UserTask, label, assigneeType, assignee, approvalMode: 'single', rejectPolicy: 'reject-on-any' } }
}

function makeGatewayNode(id: string, label: string, x: number, y: number): FlowNodeData {
  return { id, shape: 'bpmn-exclusive-gateway', x, y, width: 50, height: 50, data: { bpmnType: BpmnElementType.ExclusiveGateway, label, gatewayDirection: 'diverging' } }
}

function makeEdge(id: string, source: string, target: string, label?: string): FlowEdgeData {
  return { id, shape: 'bpmn-sequence-flow', source: { cell: source }, target: { cell: target }, data: { label: label ?? '' } }
}

// ────────────────────────────────────────────
// Form schema builders for each template
// ────────────────────────────────────────────

function buildLeaveFormSchema(): Record<string, unknown>[] {
  return [
    { id: uuidv4(), type: 'form', props: { title: '请假申请' }, children: [
      { id: uuidv4(), type: 'input', props: { label: '申请人', field: 'applicantName', required: true, placeholder: '请输入姓名' } },
      { id: uuidv4(), type: 'select', props: { label: '请假类型', field: 'leaveType', required: true, options: [{ label: '年假', value: 'annual' }, { label: '事假', value: 'personal' }, { label: '病假', value: 'sick' }, { label: '婚假', value: 'marriage' }] } },
      { id: uuidv4(), type: 'date-range', props: { label: '请假时间', field: 'leaveDateRange', required: true } },
      { id: uuidv4(), type: 'textarea', props: { label: '请假事由', field: 'reason', required: true, rows: 3 } },
    ] },
  ]
}

function buildExpenseFormSchema(): Record<string, unknown>[] {
  return [
    { id: uuidv4(), type: 'form', props: { title: '报销申请' }, children: [
      { id: uuidv4(), type: 'input', props: { label: '申请人', field: 'applicantName', required: true } },
      { id: uuidv4(), type: 'select', props: { label: '费用类型', field: 'expenseType', required: true, options: [{ label: '交通', value: 'transport' }, { label: '餐饮', value: 'meal' }, { label: '住宿', value: 'hotel' }, { label: '办公用品', value: 'office' }] } },
      { id: uuidv4(), type: 'number', props: { label: '报销金额', field: 'amount', required: true, min: 0, precision: 2 } },
      { id: uuidv4(), type: 'date', props: { label: '费用日期', field: 'expenseDate', required: true } },
      { id: uuidv4(), type: 'upload', props: { label: '发票附件', field: 'invoiceFiles', accept: '.jpg,.png,.pdf' } },
      { id: uuidv4(), type: 'textarea', props: { label: '备注说明', field: 'remark', rows: 3 } },
    ] },
  ]
}

function buildPurchaseFormSchema(): Record<string, unknown>[] {
  return [
    { id: uuidv4(), type: 'form', props: { title: '采购申请' }, children: [
      { id: uuidv4(), type: 'input', props: { label: '申请人', field: 'applicantName', required: true } },
      { id: uuidv4(), type: 'input', props: { label: '采购物品', field: 'itemName', required: true } },
      { id: uuidv4(), type: 'number', props: { label: '数量', field: 'quantity', required: true, min: 1 } },
      { id: uuidv4(), type: 'number', props: { label: '单价(元)', field: 'unitPrice', required: true, min: 0, precision: 2 } },
      { id: uuidv4(), type: 'number', props: { label: '总金额(元)', field: 'totalAmount', required: true, min: 0, precision: 2 } },
      { id: uuidv4(), type: 'input', props: { label: '供应商', field: 'supplier' } },
      { id: uuidv4(), type: 'textarea', props: { label: '采购原因', field: 'reason', required: true, rows: 3 } },
    ] },
  ]
}

function buildOnboardingFormSchema(): Record<string, unknown>[] {
  return [
    { id: uuidv4(), type: 'form', props: { title: '入职申请' }, children: [
      { id: uuidv4(), type: 'input', props: { label: '员工姓名', field: 'employeeName', required: true } },
      { id: uuidv4(), type: 'input', props: { label: '所属部门', field: 'department', required: true } },
      { id: uuidv4(), type: 'input', props: { label: '岗位', field: 'position', required: true } },
      { id: uuidv4(), type: 'date', props: { label: '入职日期', field: 'startDate', required: true } },
      { id: uuidv4(), type: 'input', props: { label: '联系邮箱', field: 'email' } },
      { id: uuidv4(), type: 'input', props: { label: '联系电话', field: 'phone' } },
      { id: uuidv4(), type: 'textarea', props: { label: '备注', field: 'remark', rows: 2 } },
    ] },
  ]
}

function buildResignationFormSchema(): Record<string, unknown>[] {
  return [
    { id: uuidv4(), type: 'form', props: { title: '离职申请' }, children: [
      { id: uuidv4(), type: 'input', props: { label: '申请人', field: 'applicantName', required: true } },
      { id: uuidv4(), type: 'input', props: { label: '所属部门', field: 'department', required: true } },
      { id: uuidv4(), type: 'date', props: { label: '预计离职日期', field: 'lastWorkingDay', required: true } },
      { id: uuidv4(), type: 'select', props: { label: '离职原因', field: 'resignReason', required: true, options: [{ label: '个人发展', value: 'career' }, { label: '家庭原因', value: 'family' }, { label: '身体原因', value: 'health' }, { label: '其他', value: 'other' }] } },
      { id: uuidv4(), type: 'textarea', props: { label: '详细说明', field: 'detail', rows: 3 } },
    ] },
  ]
}

function buildAssetFormSchema(): Record<string, unknown>[] {
  return [
    { id: uuidv4(), type: 'form', props: { title: '资产领用申请' }, children: [
      { id: uuidv4(), type: 'input', props: { label: '申请人', field: 'applicantName', required: true } },
      { id: uuidv4(), type: 'input', props: { label: '所属部门', field: 'department', required: true } },
      { id: uuidv4(), type: 'select', props: { label: '资产类型', field: 'assetType', required: true, options: [{ label: '笔记本电脑', value: 'laptop' }, { label: '显示器', value: 'monitor' }, { label: '手机', value: 'phone' }, { label: '其他', value: 'other' }] } },
      { id: uuidv4(), type: 'input', props: { label: '资产名称', field: 'assetName', required: true } },
      { id: uuidv4(), type: 'number', props: { label: '数量', field: 'quantity', required: true, min: 1 } },
      { id: uuidv4(), type: 'date', props: { label: '预计使用时间', field: 'expectedDate', required: true } },
      { id: uuidv4(), type: 'textarea', props: { label: '使用说明', field: 'purpose', rows: 3 } },
    ] },
  ]
}

// ────────────────────────────────────────────
// Built-in templates
// ────────────────────────────────────────────

const BUILTIN_TEMPLATES = [
  {
    name: '请假审批',
    description: '标准请假审批流程：员工提交请假申请 → 部门经理审批 → HR 备案。支持年假、事假、病假等多种类型。',
    category: '人事' as const,
    tags: ['请假', '人事', '日常'],
    formSchema: buildLeaveFormSchema(),
    flowDefinition: {
      nodes: [
        makeStartNode('start', 100, 200),
        makeUserTaskNode('dept-approve', '部门经理审批', 240, 185, 'role', 'department_manager'),
        makeUserTaskNode('hr-record', 'HR 备案', 520, 185, 'role', 'hr'),
        makeEndNode('end', 800, 200),
      ],
      edges: [
        makeEdge('e1', 'start', 'dept-approve'),
        makeEdge('e2', 'dept-approve', 'hr-record'),
        makeEdge('e3', 'hr-record', 'end'),
      ],
    },
    dataUpdateRules: [
      { trigger: 'task_completed', targetField: 'status', sourceField: 'task_status', transform: 'approved' },
    ],
  },
  {
    name: '报销审批',
    description: '费用报销审批流程：提交报销单 → 金额判断 → 经理/财务分级审批。5000 元以上需经理额外审批。',
    category: '财务' as const,
    tags: ['报销', '财务', '审批'],
    formSchema: buildExpenseFormSchema(),
    flowDefinition: {
      nodes: [
        makeStartNode('start', 100, 200),
        makeGatewayNode('gw-amount', '金额判断', 300, 190),
        makeUserTaskNode('manager-approve', '经理审批', 500, 85, 'role', 'manager'),
        makeUserTaskNode('finance-approve', '财务审批', 500, 285, 'role', 'finance'),
        makeEndNode('end', 750, 200),
      ],
      edges: [
        makeEdge('e1', 'start', 'gw-amount'),
        makeEdge('e2', 'gw-amount', 'manager-approve', '金额 > 5000'),
        makeEdge('e3', 'gw-amount', 'finance-approve', '金额 <= 5000'),
        makeEdge('e4', 'manager-approve', 'finance-approve'),
        makeEdge('e5', 'finance-approve', 'end'),
      ],
    },
    dataUpdateRules: [],
  },
  {
    name: '采购审批',
    description: '采购申请审批流程：部门申请 → 经理审批 → 金额分级审批 → 财务确认。10000 元以上需 VP 审批。',
    category: '采购' as const,
    tags: ['采购', '审批', '财务'],
    formSchema: buildPurchaseFormSchema(),
    flowDefinition: {
      nodes: [
        makeStartNode('start', 100, 200),
        makeUserTaskNode('dept-apply', '部门申请', 240, 185, 'user', ''),
        makeUserTaskNode('dept-approve', '部门经理审批', 470, 185, 'role', 'department_manager'),
        makeGatewayNode('gw-amount', '金额判断', 700, 190),
        makeUserTaskNode('vp-approve', 'VP 审批', 880, 85, 'role', 'vp'),
        makeUserTaskNode('finance-confirm', '财务确认', 880, 285, 'role', 'finance'),
        makeEndNode('end', 1120, 190),
      ],
      edges: [
        makeEdge('e1', 'start', 'dept-apply'),
        makeEdge('e2', 'dept-apply', 'dept-approve'),
        makeEdge('e3', 'dept-approve', 'gw-amount'),
        makeEdge('e4', 'gw-amount', 'vp-approve', '金额 > 10000'),
        makeEdge('e5', 'gw-amount', 'finance-confirm', '金额 <= 10000'),
        makeEdge('e6', 'vp-approve', 'finance-confirm'),
        makeEdge('e7', 'finance-confirm', 'end'),
      ],
    },
    dataUpdateRules: [],
  },
  {
    name: '入职审批',
    description: '新员工入职流程：HR 发起入职 → IT 配置账号 + 行政准备工位（并行）→ 部门经理确认。',
    category: '人事' as const,
    tags: ['入职', '人事', '并行'],
    formSchema: buildOnboardingFormSchema(),
    flowDefinition: {
      nodes: [
        makeStartNode('start', 100, 200),
        makeUserTaskNode('hr-init', 'HR 发起入职', 240, 185, 'role', 'hr'),
        makeUserTaskNode('it-setup', 'IT 配置账号', 470, 85, 'role', 'it'),
        makeUserTaskNode('admin-setup', '行政准备工位', 470, 285, 'role', 'admin'),
        makeUserTaskNode('manager-confirm', '部门经理确认', 700, 185, 'role', 'department_manager'),
        makeEndNode('end', 940, 200),
      ],
      edges: [
        makeEdge('e1', 'start', 'hr-init'),
        makeEdge('e2', 'hr-init', 'it-setup'),
        makeEdge('e3', 'hr-init', 'admin-setup'),
        makeEdge('e4', 'it-setup', 'manager-confirm'),
        makeEdge('e5', 'admin-setup', 'manager-confirm'),
        makeEdge('e6', 'manager-confirm', 'end'),
      ],
    },
    dataUpdateRules: [
      { trigger: 'task_completed', targetField: 'itStatus', sourceField: 'it_setup_status' },
      { trigger: 'task_completed', targetField: 'adminStatus', sourceField: 'admin_setup_status' },
    ],
  },
  {
    name: '离职审批',
    description: '员工离职流程：提交离职 → 经理审批 → HR 办理交接 + IT 回收权限（并行）→ 财务结算。',
    category: '人事' as const,
    tags: ['离职', '人事', '并行'],
    formSchema: buildResignationFormSchema(),
    flowDefinition: {
      nodes: [
        makeStartNode('start', 100, 200),
        makeUserTaskNode('employee-submit', '员工提交离职', 240, 185, 'user', ''),
        makeUserTaskNode('dept-approve', '部门经理审批', 470, 185, 'role', 'department_manager'),
        makeUserTaskNode('hr-handover', 'HR 办理交接', 700, 85, 'role', 'hr'),
        makeUserTaskNode('it-revoke', 'IT 回收权限', 700, 285, 'role', 'it'),
        makeUserTaskNode('finance-settle', '财务结算', 930, 185, 'role', 'finance'),
        makeEndNode('end', 1170, 200),
      ],
      edges: [
        makeEdge('e1', 'start', 'employee-submit'),
        makeEdge('e2', 'employee-submit', 'dept-approve'),
        makeEdge('e3', 'dept-approve', 'hr-handover'),
        makeEdge('e4', 'dept-approve', 'it-revoke'),
        makeEdge('e5', 'hr-handover', 'finance-settle'),
        makeEdge('e6', 'it-revoke', 'finance-settle'),
        makeEdge('e7', 'finance-settle', 'end'),
      ],
    },
    dataUpdateRules: [],
  },
  {
    name: 'IT 资产领用',
    description: 'IT 资产领用审批流程：员工申请 → 部门经理审批 → IT 确认库存 → 资产管理员发放。',
    category: 'IT' as const,
    tags: ['资产', 'IT', '领用'],
    formSchema: buildAssetFormSchema(),
    flowDefinition: {
      nodes: [
        makeStartNode('start', 100, 200),
        makeUserTaskNode('dept-approve', '部门经理审批', 280, 185, 'role', 'department_manager'),
        makeUserTaskNode('it-confirm', 'IT 确认库存', 520, 185, 'role', 'it'),
        makeUserTaskNode('asset-deliver', '资产管理员发放', 760, 185, 'role', 'admin'),
        makeEndNode('end', 1000, 200),
      ],
      edges: [
        makeEdge('e1', 'start', 'dept-approve'),
        makeEdge('e2', 'dept-approve', 'it-confirm'),
        makeEdge('e3', 'it-confirm', 'asset-deliver'),
        makeEdge('e4', 'asset-deliver', 'end'),
      ],
    },
    dataUpdateRules: [
      { trigger: 'task_completed', targetField: 'assetStatus', sourceField: 'delivery_status', transform: 'delivered' },
    ],
  },
]

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

  for (const tpl of BUILTIN_TEMPLATES) {
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
