/**
 * Schema MCP Server — exposes Schema CRUD tools via MCP protocol.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { PublishedSchemaModel } from '../../models/PublishedSchema.js'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createSchemaServer(): McpServer {
  const server = new McpServer({
    name: 'schema-form-schemas',
    version: '1.0.0',
  })

  // ── search_schemas ──
  server.tool(
    'search_schemas',
    '搜索表单 Schema 列表，支持按关键词和类型筛选。返回 Schema 的 id、name、type、status 等摘要信息。',
    {
      keyword: z.string().describe('搜索关键词，匹配 Schema 名称'),
      type: z.enum(['form', 'search_list']).optional().describe('Schema 类型：form=表单，search_list=搜索列表'),
      limit: z.number().default(10).describe('返回数量上限'),
    },
    async ({ keyword, type, limit }) => {
      const query: Record<string, unknown> = {
        name: { $regex: escapeRegex(keyword), $options: 'i' },
      }
      if (type) query.type = type

      const results = await FormSchemaModel.find(query)
        .select('name type status updatedAt')
        .limit(limit)
        .sort({ updatedAt: -1 })
        .lean() as Record<string, unknown>[]

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            data: results,
            summary: `找到 ${results.length} 个 Schema`,
          }),
        }],
      }
    },
  )

  // ── get_schema_detail ──
  server.tool(
    'get_schema_detail',
    '获取 Schema 完整信息，包括字段定义、配置和元数据。',
    {
      schemaId: z.string().describe('Schema ID'),
    },
    async ({ schemaId }) => {
      const schema = await FormSchemaModel.findById(schemaId).lean() as Record<string, unknown> | null
      if (!schema) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ success: false, error: `Schema ${schemaId} 不存在` }) }],
          isError: true,
        }
      }

      const widgetCount = Array.isArray(schema.json) ? (schema.json as unknown[]).length : 0
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            data: {
              id: schema._id,
              editId: schema.editId,
              name: schema.name,
              type: schema.type,
              status: schema.status,
              version: schema.version,
              json: schema.json,
              createdAt: schema.createdAt,
              updatedAt: schema.updatedAt,
            },
            summary: `Schema "${schema.name}"（${schema.type}，${schema.status}）包含 ${widgetCount} 个组件`,
          }),
        }],
      }
    },
  )

  // ── validate_schema ──
  server.tool(
    'validate_schema',
    '验证 Schema 结构是否正确，检查字段类型、必填项和配置。',
    {
      schema: z.object({}).passthrough().describe('Schema 对象'),
    },
    async ({ schema }) => {
      const errors: string[] = []
      const s = schema as Record<string, unknown>
      if (!s.name) errors.push('缺少 name 字段')
      if (!s.type) errors.push('缺少 type 字段')
      if (!s.json) errors.push('缺少 json 字段')
      if (s.type && !['form', 'search_list'].includes(s.type as string)) {
        errors.push(`无效的 type: ${s.type}，应为 form 或 search_list`)
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: errors.length === 0,
            errors,
            summary: errors.length === 0 ? 'Schema 验证通过' : `发现 ${errors.length} 个问题`,
          }),
        }],
      }
    },
  )

  // ── search_published_schemas ──
  server.tool(
    'search_published_schemas',
    '搜索已发布的 Schema 列表，用于生产环境。',
    {
      keyword: z.string().describe('搜索关键词'),
      type: z.enum(['form', 'search_list']).optional().describe('Schema 类型'),
      limit: z.number().default(10).describe('返回数量上限'),
    },
    async ({ keyword, type, limit }) => {
      const query: Record<string, unknown> = {
        name: { $regex: escapeRegex(keyword), $options: 'i' },
      }
      if (type) query.type = type

      const results = await PublishedSchemaModel.find(query)
        .select('name type publishId version publishedAt')
        .limit(limit)
        .sort({ publishedAt: -1 })
        .lean() as Record<string, unknown>[]

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            data: results,
            summary: `找到 ${results.length} 个已发布 Schema`,
          }),
        }],
      }
    },
  )

  return server
}
