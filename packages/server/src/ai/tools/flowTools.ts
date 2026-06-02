/**
 * Flow Agent tools — LangGraph StructuredTool format.
 *
 * Provides flow search, user/role lookup, schema binding, schema generation,
 * and validation capabilities for the Flow Agent to query real data during generation.
 */

import { tool } from '@langchain/core/tools'
import { FlowDefinitionModel } from '../../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../../flow-models/FlowVersion.js'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { UserModel } from '../../models/User.js'
import { escapeRegex } from '../graph/agentBase.js'
import { generateSchemaFromPrompt } from './schemaGenerator.js'
import { z } from 'zod'

// ────────────────────────────────────────────
// Tool result type
// ────────────────────────────────────────────

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  summary?: string
}

// ────────────────────────────────────────────
// LangGraph tools
// ────────────────────────────────────────────

export const searchFlowsTool = tool(
  async ({ keyword, status, category, limit }): Promise<ToolResult> => {
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

    const mapped = flows.map((f: Record<string, unknown>) => ({
      id: f._id,
      name: f.name,
      description: f.description,
      category: f.category,
      status: f.status,
      currentVersionId: f.currentVersionId,
      createdBy: f.createdBy,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }))

    const summary = flows.length === 0
      ? `没有找到${keyword ? `包含"${keyword}"的` : ''}流程`
      : `找到 ${flows.length} 个流程：${mapped.slice(0, 3).map((f: Record<string, unknown>) => `${f.name}（${f.status}）`).join('、')}${flows.length > 3 ? '等' : ''}`

    return {
      success: true,
      data: { total: flows.length, flows: mapped },
      summary,
    }
  },
  {
    name: 'search_flows',
    description: '搜索已有的流程定义。可查找现有流程作为参考或查找需要修改的流程。',
    schema: z.object({
      keyword: z.string().optional().describe('按名称/描述模糊搜索'),
      status: z.enum(['draft', 'published', 'archived']).optional().describe('按状态筛选'),
      category: z.string().optional().describe('按分类筛选'),
      limit: z.number().optional().default(10).describe('返回数量上限，默认 10'),
    }),
  },
)

export const getFlowDetailTool = tool(
  async ({ flowId }): Promise<ToolResult> => {
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

    const nodeCount = graph ? ((graph as Record<string, unknown>).nodes as unknown[])?.length ?? 0 : 0
    const edgeCount = graph ? ((graph as Record<string, unknown>).edges as unknown[])?.length ?? 0 : 0

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
      summary: `流程 "${definition.name}"（${definition.status}）包含 ${nodeCount} 个节点、${edgeCount} 条边`,
    }
  },
  {
    name: 'get_flow_detail',
    description: '获取流程定义详情，包括当前版本的完整 FlowGraph（节点和边）。用于深入了解现有流程结构。',
    schema: z.object({
      flowId: z.string().describe('流程定义的 _id'),
    }),
  },
)

export const searchUsersTool = tool(
  async ({ keyword, role, limit }): Promise<ToolResult> => {
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

    const mapped = users.map((u: Record<string, unknown>) => ({
      id: u._id,
      username: u.username,
      displayName: u.displayName,
      roles: u.roles,
    }))

    const summary = users.length === 0
      ? `没有找到${keyword ? `包含"${keyword}"的` : ''}用户`
      : `找到 ${users.length} 个用户：${mapped.slice(0, 5).map((u: Record<string, unknown>) => `${u.displayName || u.username}`).join('、')}${users.length > 5 ? '等' : ''}`

    return {
      success: true,
      data: { total: users.length, users: mapped },
      summary,
    }
  },
  {
    name: 'search_users',
    description: '搜索用户列表，用于设置审批节点的指派人（assignee/candidateUsers）。返回用户的 ID、姓名和角色。',
    schema: z.object({
      keyword: z.string().optional().describe('按用户名/显示名模糊搜索'),
      role: z.string().optional().describe('按角色 ID 筛选'),
      limit: z.number().optional().default(20).describe('返回数量上限，默认 20'),
    }),
  },
)

export const searchSchemasForFlowTool = tool(
  async ({ keyword, type, limit }): Promise<ToolResult> => {
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

    const mapped = schemas.map((s: Record<string, unknown>) => ({
      id: s._id,
      name: s.name,
      type: s.type,
      status: s.status,
      version: s.version,
    }))

    const summary = schemas.length === 0
      ? `没有找到${keyword ? `包含"${keyword}"的` : ''}表单`
      : `找到 ${schemas.length} 个表单：${mapped.slice(0, 3).map((s: Record<string, unknown>) => `${s.name}（${s.status}）`).join('、')}${schemas.length > 3 ? '等' : ''}`

    return {
      success: true,
      data: { total: schemas.length, schemas: mapped },
      summary,
    }
  },
  {
    name: 'search_schemas',
    description: '搜索表单 Schema，用于为 userTask 配置 formSchemaId 绑定表单。返回 Schema 的 ID、名称和类型。',
    schema: z.object({
      keyword: z.string().optional().describe('按名称模糊搜索'),
      type: z.enum(['form', 'search_list']).optional().describe('按类型筛选'),
      limit: z.number().optional().default(10).describe('返回数量上限，默认 10'),
    }),
  },
)

export const generateSchemaTool = tool(
  async ({ description }): Promise<ToolResult> => {
    try {
      const result = await generateSchemaFromPrompt(description)
      return {
        success: true,
        data: {
          schemaId: result.tempId,
          widgets: result.widgets,
          summary: result.summary,
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Schema 生成失败: ${message}` }
    }
  },
  {
    name: 'generate_schema',
    description: '调用 Editor Agent 生成一个表单 Schema。用于为 userTask 创建关联的表单。返回生成的 Schema JSON 和临时 ID，可在 formSchemaId 中引用。',
    schema: z.object({
      description: z.string().describe('表单的自然语言描述，如"采购申请表单，包含物品名称、数量、金额、申请人"'),
    }),
  },
)

export const validateFlowTool = tool(
  async ({ flow }): Promise<ToolResult> => {
    const errors = validateFlowGraph(flow as FlowGraphInput)

    const summary = errors.length === 0
      ? `流程校验通过，${flow.nodes.length} 个节点、${flow.edges.length} 条边`
      : `流程校验失败，${errors.length} 个错误：${errors.slice(0, 3).join('；')}${errors.length > 3 ? '等' : ''}`

    return {
      success: true,
      data: { valid: errors.length === 0, errors },
      summary,
    }
  },
  {
    name: 'validate_flow',
    description: '校验 FlowGraph 的结构正确性。在生成流程后调用此工具确认无误再返回给用户。',
    schema: z.object({
      flow: z.object({
        nodes: z.array(z.record(z.unknown())).describe('流程节点数组'),
        edges: z.array(z.record(z.unknown())).describe('流程边数组'),
      }).describe('要校验的 FlowGraph，包含 nodes 和 edges 数组'),
    }),
  },
)

// ────────────────────────────────────────────
// Exported tool array for ToolNode
// ────────────────────────────────────────────

export const flowTools = [
  searchFlowsTool,
  getFlowDetailTool,
  searchUsersTool,
  searchSchemasForFlowTool,
  generateSchemaTool,
  validateFlowTool,
]

// ────────────────────────────────────────────
// Shared validation logic (used by agent output validation)
// ────────────────────────────────────────────

interface FlowGraphInput {
  nodes: Record<string, unknown>[]
  edges: Record<string, unknown>[]
}

/**
 * Core flow validation logic — shared between tool execution and agent output validation.
 */
export function validateFlowGraph(flow: FlowGraphInput): string[] {
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
