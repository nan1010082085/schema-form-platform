/**
 * Flow Agent tools — OpenAI function calling format.
 *
 * Provides flow search, user/role lookup, schema binding, and validation
 * capabilities for the Flow Agent to query real data during generation.
 */

import { FlowDefinitionModel } from '../../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../../flow-models/FlowVersion.js'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { UserModel } from '../../models/User.js'
import { escapeRegex } from '../graph/agentBase.js'

// ────────────────────────────────────────────
// OpenAI tool definitions
// ────────────────────────────────────────────

export const FLOW_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_flows',
      description: '搜索已有的流程定义。可查找现有流程作为参考或查找需要修改的流程。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '按名称/描述模糊搜索' },
          status: { type: 'string', enum: ['draft', 'published', 'archived'], description: '按状态筛选' },
          category: { type: 'string', description: '按分类筛选' },
          limit: { type: 'number', description: '返回数量上限，默认 10' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_flow_detail',
      description: '获取流程定义详情，包括当前版本的完整 FlowGraph（节点和边）。用于深入了解现有流程结构。',
      parameters: {
        type: 'object',
        properties: {
          flowId: { type: 'string', description: '流程定义的 _id' },
        },
        required: ['flowId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_users',
      description: '搜索用户列表，用于设置审批节点的指派人（assignee/candidateUsers）。返回用户的 ID、姓名和角色。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '按用户名/显示名模糊搜索' },
          role: { type: 'string', description: '按角色 ID 筛选' },
          limit: { type: 'number', description: '返回数量上限，默认 20' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_schemas',
      description: '搜索表单 Schema，用于为 userTask 配置 formSchemaId 绑定表单。返回 Schema 的 ID、名称和类型。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '按名称模糊搜索' },
          type: { type: 'string', enum: ['form', 'search_list'], description: '按类型筛选' },
          limit: { type: 'number', description: '返回数量上限，默认 10' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'validate_flow',
      description: '校验 FlowGraph 的结构正确性。在生成流程后调用此工具确认无误再返回给用户。',
      parameters: {
        type: 'object',
        properties: {
          flow: {
            type: 'object',
            description: '要校验的 FlowGraph，包含 nodes 和 edges 数组',
            properties: {
              nodes: { type: 'array', items: { type: 'object' } },
              edges: { type: 'array', items: { type: 'object' } },
            },
            required: ['nodes', 'edges'],
          },
        },
        required: ['flow'],
      },
    },
  },
]

// ────────────────────────────────────────────
// Tool execution
// ────────────────────────────────────────────

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export async function executeFlowTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name) {
    case 'search_flows':
      return searchFlows(args)
    case 'get_flow_detail':
      return getFlowDetail(args)
    case 'search_users':
      return searchUsers(args)
    case 'search_schemas':
      return searchSchemas(args)
    case 'validate_flow':
      return validateFlowTool(args)
    default:
      return { success: false, error: `Unknown tool: ${name}` }
  }
}

// ────────────────────────────────────────────
// Implementations
// ────────────────────────────────────────────

async function searchFlows(args: Record<string, unknown>): Promise<ToolResult> {
  const keyword = args.keyword as string | undefined
  const status = args.status as string | undefined
  const category = args.category as string | undefined
  const limit = (args.limit as number) || 10

  const filter: Record<string, unknown> = {}
  if (keyword) {
    filter.$or = [
      { name: { $regex: escapeRegex(keyword), $options: 'i' } },
      { description: { $regex: escapeRegex(keyword), $options: 'i' } },
    ]
  }
  if (status) filter.status = status
  if (category) filter.category = category

  const flows = await FlowDefinitionModel.find(filter)
    .select('_id name description category status currentVersionId createdBy createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()

  return {
    success: true,
    data: {
      total: flows.length,
      flows: flows.map((f: Record<string, unknown>) => ({
        id: f._id,
        name: f.name,
        description: f.description,
        category: f.category,
        status: f.status,
        currentVersionId: f.currentVersionId,
        createdBy: f.createdBy,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    },
  }
}

async function getFlowDetail(args: Record<string, unknown>): Promise<ToolResult> {
  const flowId = args.flowId as string
  if (!flowId) {
    return { success: false, error: 'flowId is required' }
  }

  const definition = await FlowDefinitionModel.findById(flowId).lean() as Record<string, unknown> | null
  if (!definition) {
    return { success: false, error: `Flow definition ${flowId} not found` }
  }

  let graph: Record<string, unknown> | null = null
  if (definition.currentVersionId) {
    const version = await FlowVersionModel.findById(definition.currentVersionId).lean() as Record<string, unknown> | null
    if (version) {
      graph = version.graph as Record<string, unknown>
    }
  }

  return {
    success: true,
    data: {
      id: definition._id,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      status: definition.status,
      createdBy: definition.createdBy,
      graph,
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    },
  }
}

async function searchUsers(args: Record<string, unknown>): Promise<ToolResult> {
  const keyword = args.keyword as string | undefined
  const role = args.role as string | undefined
  const limit = (args.limit as number) || 20

  const filter: Record<string, unknown> = {}
  if (keyword) {
    filter.$or = [
      { username: { $regex: escapeRegex(keyword), $options: 'i' } },
      { displayName: { $regex: escapeRegex(keyword), $options: 'i' } },
    ]
  }
  if (role) {
    filter.roles = role
  }

  const users = await UserModel.find(filter)
    .select('_id username displayName roles')
    .sort({ username: 1 })
    .limit(limit)
    .lean()

  return {
    success: true,
    data: {
      total: users.length,
      users: users.map((u: Record<string, unknown>) => ({
        id: u._id,
        username: u.username,
        displayName: u.displayName,
        roles: u.roles,
      })),
    },
  }
}

async function searchSchemas(args: Record<string, unknown>): Promise<ToolResult> {
  const keyword = args.keyword as string | undefined
  const type = args.type as string | undefined
  const limit = (args.limit as number) || 10

  const filter: Record<string, unknown> = {}
  if (keyword) {
    filter.name = { $regex: escapeRegex(keyword), $options: 'i' }
  }
  if (type) {
    filter.type = type
  }

  const schemas = await FormSchemaModel.find(filter)
    .select('_id name type status version')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()

  return {
    success: true,
    data: {
      total: schemas.length,
      schemas: schemas.map((s: Record<string, unknown>) => ({
        id: s._id,
        name: s.name,
        type: s.type,
        status: s.status,
        version: s.version,
      })),
    },
  }
}

/**
 * Core flow validation logic — shared between tool execution and agent output validation.
 */
export function validateFlowGraph(flow: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }): string[] {
  const errors: string[] = []
  const nodeIds = new Set(flow.nodes.map((n) => n.id))

  if (flow.nodes.length === 0) {
    errors.push('流程至少需要一个节点')
    return errors
  }

  const hasStart = flow.nodes.some((n) => (n.data as Record<string, unknown>)?.bpmnType === 'startEvent')
  const hasEnd = flow.nodes.some((n) => (n.data as Record<string, unknown>)?.bpmnType === 'endEvent')
  if (!hasStart) errors.push('缺少 startEvent 开始节点')
  if (!hasEnd) errors.push('缺少 endEvent 结束节点')

  for (const edge of flow.edges) {
    const source = edge.source as Record<string, unknown> | undefined
    const target = edge.target as Record<string, unknown> | undefined
    if (source?.cell && !nodeIds.has(source.cell)) errors.push(`边 ${edge.id} 的源节点 ${source.cell} 不存在`)
    if (target?.cell && !nodeIds.has(target.cell)) errors.push(`边 ${edge.id} 的目标节点 ${target.cell} 不存在`)
  }

  for (const node of flow.nodes) {
    const data = node.data as Record<string, unknown> | undefined
    if (data?.bpmnType === 'exclusiveGateway' && data.gatewayDirection === 'diverging') {
      const outEdges = flow.edges.filter((e) => {
        const source = e.source as Record<string, unknown> | undefined
        return source?.cell === node.id
      })
      if (outEdges.length >= 2) {
        const hasDefault = !!data.defaultFlow
        const allHaveConditions = outEdges.every((e) => {
          const edgeData = e.data as Record<string, unknown> | undefined
          return edgeData?.conditionExpression || edgeData?.isDefault
        })
        if (!hasDefault && !allHaveConditions) {
          errors.push(`排他网关 "${node.id}" 出边 >= 2 但缺少 defaultFlow 或条件表达式`)
        }
      }
    }

    if (data?.bpmnType === 'userTask') {
      const hasAssignee = data.candidateUsers || data.candidateRoles || data.assignee || data.assigneeCollection
      if (!hasAssignee) {
        errors.push(`用户任务 "${data.label || node.id}" 缺少指派人配置`)
      }
    }

    if (data?.bpmnType === 'timerEvent') {
      if (!data.timerType || !data.timerValue) {
        errors.push(`定时事件 "${data.label || node.id}" 缺少 timerType 或 timerValue`)
      }
    }
  }

  return errors
}

function validateFlowTool(args: Record<string, unknown>): ToolResult {
  const flow = args.flow as { nodes?: Record<string, unknown>[]; edges?: Record<string, unknown>[] }
  if (!flow || !Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
    return { success: false, error: 'flow 必须包含 nodes 和 edges 数组' }
  }

  const errors = validateFlowGraph(flow as { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] })

  return {
    success: true,
    data: { valid: errors.length === 0, errors },
  }
}
