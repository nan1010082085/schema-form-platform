/**
 * Flow MCP Server — exposes Flow search, detail, and validation tools via MCP protocol.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { FlowDefinitionModel } from '../../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../../flow-models/FlowVersion.js'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createFlowServer(): McpServer {
  const server = new McpServer({
    name: 'schema-form-flows',
    version: '1.0.0',
  })

  // ── search_flows ──
  server.tool(
    'search_flows',
    '搜索已有的流程定义，支持按关键词、状态和分类筛选。',
    {
      keyword: z.string().optional().describe('按名称/描述模糊搜索'),
      status: z.enum(['draft', 'published', 'archived']).optional().describe('按状态筛选'),
      category: z.string().optional().describe('按分类筛选'),
      limit: z.number().default(10).describe('返回数量上限'),
    },
    async ({ keyword, status, category, limit }) => {
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
        .lean() as Record<string, unknown>[]

      const mapped = flows.map((f) => ({
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
        : `找到 ${flows.length} 个流程：${mapped.slice(0, 3).map((f) => `${f.name}（${f.status}）`).join('、')}${flows.length > 3 ? '等' : ''}`

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ success: true, data: { total: flows.length, flows: mapped }, summary }),
        }],
      }
    },
  )

  // ── get_flow_detail ──
  server.tool(
    'get_flow_detail',
    '获取流程定义详情，包括当前版本的完整 FlowGraph（节点和边）。',
    {
      flowId: z.string().describe('流程定义的 _id'),
    },
    async ({ flowId }) => {
      const definition = await FlowDefinitionModel.findById(flowId).lean() as Record<string, unknown> | null
      if (!definition) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ success: false, error: `Flow definition ${flowId} not found` }) }],
          isError: true,
        }
      }

      let graph: Record<string, unknown> | null = null
      if (definition.currentVersionId) {
        const version = await FlowVersionModel.findById(definition.currentVersionId as string).lean() as Record<string, unknown> | null
        if (version) {
          graph = version.graph as Record<string, unknown>
        }
      }

      const nodeCount = graph ? ((graph.nodes as unknown[])?.length ?? 0) : 0
      const edgeCount = graph ? ((graph.edges as unknown[])?.length ?? 0) : 0

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
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
          }),
        }],
      }
    },
  )

  // ── validate_flow ──
  server.tool(
    'validate_flow',
    '校验 FlowGraph 的结构正确性。检查 startEvent/endEvent 存在性、边引用合法性、userTask 指派人配置等。',
    {
      flow: z.object({
        nodes: z.array(z.record(z.unknown())).describe('流程节点数组'),
        edges: z.array(z.record(z.unknown())).describe('流程边数组'),
      }).describe('要校验的 FlowGraph'),
    },
    async ({ flow }) => {
      const errors = validateFlowGraph(flow)

      const summary = errors.length === 0
        ? `流程校验通过，${flow.nodes.length} 个节点、${flow.edges.length} 条边`
        : `流程校验失败，${errors.length} 个错误：${errors.slice(0, 3).join('；')}${errors.length > 3 ? '等' : ''}`

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            data: { valid: errors.length === 0, errors },
            summary,
          }),
        }],
      }
    },
  )

  return server
}

// ── Flow validation logic (shared with flowTools) ──

interface FlowGraphInput {
  nodes: Record<string, unknown>[]
  edges: Record<string, unknown>[]
}

function validateFlowGraph(flow: FlowGraphInput): string[] {
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
    if (source?.cell && !nodeIds.has(source.cell as string)) errors.push(`边 ${edge.id} 的源节点 ${source.cell} 不存在`)
    if (target?.cell && !nodeIds.has(target.cell as string)) errors.push(`边 ${edge.id} 的目标节点 ${target.cell} 不存在`)
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
        errors.push(`用户任务 "${(data.label as string) || (node.id as string)}" 缺少指派人配置`)
      }
    }

    if (data?.bpmnType === 'timerEvent') {
      if (!data.timerType || !data.timerValue) {
        errors.push(`定时事件 "${(data.label as string) || (node.id as string)}" 缺少 timerType 或 timerValue`)
      }
    }
  }

  return errors
}
