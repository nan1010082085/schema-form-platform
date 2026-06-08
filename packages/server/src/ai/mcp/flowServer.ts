/**
 * Flow MCP Server — 通过 MCP 协议暴露 Flow 工具。
 *
 * 使用共享 flowService 层，与 LangGraph 工具共用同一份业务逻辑。
 * 工具名使用 flow__ 前缀实现命名空间隔离。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  searchFlows,
  getFlowDetail,
  searchUsers,
  validateFlowGraph,
} from '../services/flowService.js'

export function createFlowServer(): McpServer {
  const server = new McpServer({
    name: 'schema-form-flows',
    version: '2.0.0',
  })

  // ── flow__search ──
  server.tool(
    'flow__search',
    '搜索已有的流程定义，支持按关键词、状态和分类筛选。',
    {
      keyword: z.string().optional().describe('按名称/描述模糊搜索'),
      status: z.enum(['draft', 'published', 'archived']).optional().describe('按状态筛选'),
      category: z.string().optional().describe('按分类筛选'),
      limit: z.number().default(10).describe('返回数量上限'),
    },
    async (params) => {
      const result = await searchFlows(params)
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    },
  )

  // ── flow__get_detail ──
  server.tool(
    'flow__get_detail',
    '获取流程定义详情，包括当前版本的完整 FlowGraph（节点和边）。',
    {
      flowId: z.string().describe('流程定义的 _id'),
    },
    async ({ flowId }) => {
      const result = await getFlowDetail(flowId)
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        isError: !result.success,
      }
    },
  )

  // ── flow__validate ──
  server.tool(
    'flow__validate',
    '校验 FlowGraph 的结构正确性。检查 startEvent/endEvent 存在性、边引用合法性、网关条件、userTask 指派人配置等。',
    {
      flow: z.object({
        nodes: z.array(z.record(z.unknown())).describe('流程节点数组'),
        edges: z.array(z.record(z.unknown())).describe('流程边数组'),
      }).describe('要校验的 FlowGraph'),
    },
    async ({ flow }) => {
      const result = validateFlowGraph(flow)
      const summary = result.valid
        ? `流程校验通过，${flow.nodes.length} 个节点、${flow.edges.length} 条边`
        : `流程校验失败，${result.errors.length} 个错误：${result.errors.slice(0, 3).join('；')}${result.errors.length > 3 ? '等' : ''}`

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ success: true, data: { valid: result.valid, errors: result.errors }, summary }),
        }],
      }
    },
  )

  // ── flow__search_users ──
  server.tool(
    'flow__search_users',
    '搜索用户列表，用于设置审批节点的指派人。',
    {
      keyword: z.string().optional().describe('按用户名/显示名模糊搜索'),
      role: z.string().optional().describe('按角色 ID 筛选'),
      limit: z.number().default(20).describe('返回数量上限'),
    },
    async (params) => {
      const result = await searchUsers(params)
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    },
  )

  // ── flow__get_node_schema ──
  server.tool(
    'flow__get_node_schema',
    '获取流程节点绑定的表单 Schema 信息。',
    {
      flowId: z.string().describe('流程定义 ID'),
      nodeId: z.string().describe('节点 ID'),
    },
    async ({ flowId, nodeId }) => {
      const { FlowVersionModel } = await import('../../flow-models/FlowVersion.js')
      const { FormSchemaModel } = await import('../../models/FormSchema.js')

      const version = await FlowVersionModel.findOne({ definitionId: flowId })
        .sort({ version: -1 }).lean() as Record<string, unknown> | null

      if (!version?.graph) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ success: false, error: `Flow ${flowId} has no version` }) }],
          isError: true,
        }
      }

      const nodes = ((version.graph as Record<string, unknown>).nodes ?? []) as Array<Record<string, unknown>>
      const node = nodes.find((n) => n.id === nodeId)

      if (!node) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ success: false, error: `Node ${nodeId} not found` }) }],
          isError: true,
        }
      }

      const data = node.data as Record<string, unknown> | undefined
      const formSchemaId = data?.formSchemaId as string | undefined

      if (!formSchemaId) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ success: true, data: { nodeId, hasSchema: false }, summary: `节点 ${nodeId} 未绑定表单` }) }],
        }
      }

      const schema = await FormSchemaModel.findById(formSchemaId)
        .select('_id name type version json').lean() as Record<string, unknown> | null

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            data: {
              nodeId, hasSchema: true, formSchemaId,
              formPublishId: data?.formPublishId,
              formVersion: data?.formVersion,
              formMode: data?.formMode,
              schemaName: schema?.name,
              schemaType: schema?.type,
              widgetCount: Array.isArray(schema?.json) ? (schema.json as unknown[]).length : 0,
            },
            summary: schema
              ? `节点 ${nodeId} 绑定了表单 "${schema.name}"（${formSchemaId}）`
              : `节点 ${nodeId} 引用了 Schema ${formSchemaId}，但该 Schema 已不存在`,
          }),
        }],
      }
    },
  )

  return server
}
