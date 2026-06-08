/**
 * Schema MCP Server — 通过 MCP 协议暴露 Schema 工具。
 *
 * 使用共享 schemaService 层，与 LangGraph 工具共用同一份业务逻辑。
 * 工具名使用 schema__ 前缀实现命名空间隔离。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  searchSchemas,
  getSchemaDetail,
  searchPublishedSchemas,
  validateSchemaDocument,
  validateWidgetSchema,
} from '../services/schemaService.js'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { escapeRegex } from '../graph/agentBase.js'

export function createSchemaServer(): McpServer {
  const server = new McpServer({
    name: 'schema-form-schemas',
    version: '2.0.0',
  })

  // ── schema__search ──
  server.tool(
    'schema__search',
    '搜索表单 Schema 列表，支持按关键词和类型筛选。返回 Schema 的 id、name、type、status 等摘要信息。',
    {
      keyword: z.string().optional().describe('搜索关键词，匹配 Schema 名称'),
      type: z.enum(['form', 'search_list']).optional().describe('Schema 类型：form=表单，search_list=搜索列表'),
      limit: z.number().default(10).describe('返回数量上限'),
      source: z.enum(['editor', 'flow']).optional().default('editor')
        .describe('调用来源：editor 返回完整字段，flow 返回精简字段'),
    },
    async (params) => {
      const result = await searchSchemas(params)
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    },
  )

  // ── schema__get_detail ──
  server.tool(
    'schema__get_detail',
    '获取 Schema 完整信息，包括字段定义、配置和元数据。',
    {
      schemaId: z.string().describe('Schema ID'),
    },
    async ({ schemaId }) => {
      const result = await getSchemaDetail(schemaId)
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        isError: !result.success,
      }
    },
  )

  // ── schema__validate ──
  server.tool(
    'schema__validate',
    '验证 Schema 文档结构（name/type/json 字段存在性）。',
    {
      schema: z.object({}).passthrough().describe('Schema 对象'),
    },
    async ({ schema }) => {
      const result = validateSchemaDocument(schema as Record<string, unknown>)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: result.valid,
            errors: result.errors,
            summary: result.valid ? 'Schema 验证通过' : `发现 ${result.errors.length} 个问题`,
          }),
        }],
      }
    },
  )

  // ── schema__validate_widgets ──
  server.tool(
    'schema__validate_widgets',
    '校验 Widget 数组的结构正确性（类型、ID、position、容器嵌套）。',
    {
      widgets: z.array(z.record(z.unknown())).describe('Widget 数组'),
    },
    async ({ widgets }) => {
      const result = await validateWidgetSchema(widgets)
      const summary = result.valid
        ? `Schema 校验通过，共 ${widgets.length} 个组件`
        : `Schema 校验失败，${result.errors.length} 个错误：${result.errors.slice(0, 3).map((e) => e.message).join('；')}${result.errors.length > 3 ? '等' : ''}`
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ success: true, data: { valid: result.valid, errors: result.errors }, summary }),
        }],
      }
    },
  )

  // ── schema__search_published ──
  server.tool(
    'schema__search_published',
    '搜索已发布的 Schema 版本，用于生产环境。',
    {
      keyword: z.string().optional().describe('搜索关键词'),
      type: z.enum(['form', 'search_list']).optional().describe('Schema 类型'),
      limit: z.number().default(10).describe('返回数量上限'),
    },
    async (params) => {
      const result = await searchPublishedSchemas(params)
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    },
  )

  // ── schema__fuzzy_search ──
  server.tool(
    'schema__fuzzy_search',
    '基于关键词模糊搜索已有 Schema（Jaccard 相似度匹配名称和组件结构中的关键词）。',
    {
      query: z.string().describe('关键词描述'),
      limit: z.number().default(5).describe('返回数量上限'),
    },
    async ({ query, limit }) => {
      // 复用 schemaService 的搜索，这里做简单的模糊匹配
      const allSchemas = await FormSchemaModel.find()
        .select('_id name type status version json createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean() as Record<string, unknown>[]

      const scored = allSchemas.map((s) => {
        const nameTokens = extractTokens(String(s.name ?? ''))
        const jsonTokens = extractTokensFromSchema(s.json)
        const allTokens = new Set([...nameTokens, ...jsonTokens])
        const queryTokens = extractTokens(query)
        const score = jaccardSimilarity(queryTokens, allTokens)
        return { schema: s, score }
      }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)

      const mapped = scored.map((r) => ({
        id: r.schema._id,
        name: r.schema.name,
        type: r.schema.type,
        status: r.schema.status,
        score: Math.round(r.score * 100),
      }))

      const summary = mapped.length === 0
        ? `没有找到与"${query}"相关的 Schema`
        : `找到 ${mapped.length} 个相关 Schema：${mapped.slice(0, 3).map((s) => `${s.name}（匹配度 ${s.score}%）`).join('、')}`

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ success: true, data: { total: mapped.length, schemas: mapped }, summary }),
        }],
      }
    },
  )

  // ── schema__find_flow_references ──
  server.tool(
    'schema__find_flow_references',
    '查找引用了指定 Schema 的所有流程节点。',
    {
      schemaId: z.string().describe('Schema ID'),
    },
    async ({ schemaId }) => {
      const { FlowVersionModel } = await import('../../flow-models/FlowVersion.js')
      const { FlowDefinitionModel } = await import('../../flow-models/FlowDefinition.js')

      const versions = await FlowVersionModel.find({
        'graph.nodes.data.formSchemaId': schemaId,
      }).select('_id definitionId version graph.nodes').lean()

      const refs: Array<{ flowId: string; flowName: string; nodeId: string; nodeLabel: string; bpmnType: string }> = []

      for (const ver of versions) {
        const verData = ver as unknown as Record<string, unknown>
        const graph = verData.graph as Record<string, unknown> | undefined
        const definitionId = verData.definitionId as string

        const def = await FlowDefinitionModel.findById(definitionId)
          .select('_id name').lean() as Record<string, unknown> | null

        const nodes = (graph?.nodes ?? []) as Array<Record<string, unknown>>
        for (const node of nodes) {
          const data = node.data as Record<string, unknown> | undefined
          if (data?.formSchemaId === schemaId) {
            refs.push({
              flowId: definitionId,
              flowName: (def?.name as string) ?? 'Unknown',
              nodeId: node.id as string,
              nodeLabel: (data.label as string) ?? (node.id as string),
              bpmnType: (data.bpmnType as string) ?? 'unknown',
            })
          }
        }
      }

      const summary = refs.length === 0
        ? '没有流程节点引用此 Schema'
        : `找到 ${refs.length} 个流程节点引用此 Schema：${refs.slice(0, 3).map((r) => `${r.flowName}/${r.nodeLabel}`).join('、')}${refs.length > 3 ? '等' : ''}`

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ success: true, data: { total: refs.length, references: refs }, summary }),
        }],
      }
    },
  )

  return server
}

// ────────────────────────────────────────────
// 工具函数（模糊搜索用）
// ────────────────────────────────────────────

function extractTokens(text: string): Set<string> {
  const tokens = new Set<string>()
  const englishWords = text.match(/[a-zA-Z]+/g) ?? []
  for (const word of englishWords) tokens.add(word.toLowerCase())
  const chineseChars = text.match(/[一-鿿]+/g) ?? []
  for (const segment of chineseChars) {
    for (let i = 0; i < segment.length - 1; i++) tokens.add(segment.slice(i, i + 2))
    if (segment.length > 0) tokens.add(segment)
  }
  return tokens
}

function extractTokensFromSchema(json: unknown): Set<string> {
  const tokens = new Set<string>()
  if (!Array.isArray(json)) return tokens
  function walk(nodes: Record<string, unknown>[]): void {
    for (const node of nodes) {
      if (node.type) tokens.add(String(node.type))
      if (node.field) tokens.add(String(node.field))
      if (node.label) { for (const t of extractTokens(String(node.label))) tokens.add(t) }
      if (Array.isArray(node.children)) walk(node.children as Record<string, unknown>[])
    }
  }
  walk(json as Record<string, unknown>[])
  return tokens
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let intersection = 0
  for (const item of a) { if (b.has(item)) intersection++ }
  return intersection / (a.size + b.size - intersection)
}
