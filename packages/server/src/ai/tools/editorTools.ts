/**
 * Editor Agent tools — LangGraph StructuredTool format.
 *
 * Widget 目录从 @schema-form/shared-ai 动态读取，
 * 新增 Widget 后重新运行提取脚本即可自动覆盖。
 */

import { tool } from '@langchain/core/tools'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { PublishedSchemaModel } from '../../models/PublishedSchema.js'
import { escapeRegex } from '../graph/agentBase.js'
import { z } from 'zod'

// ────────────────────────────────────────────
// AI 元数据类型（与 @schema-form/shared-ai 对齐）
// ────────────────────────────────────────────

interface WidgetAIMetadata {
  type: string
  group: string
  canHaveChildren: boolean
  displayName: string
  description: string
  defaultProps: Record<string, unknown>
  keyProps: string[]
  defaultSize: { w: number; h: number } | null
  exposedValues: Array<{ key: string; type: string; description: string; example?: unknown }>
  receivableEvents: Array<{ name: string; description: string; params?: Record<string, string> }>
  eventTargets: Array<{ id: string; label: string; description?: string }>
  configPanels: string[]
}

interface AIMetadata {
  version: string
  generatedAt: string
  widgets: WidgetAIMetadata[]
  flowNodes: Array<{ type: string; label: string; description: string; size: { width: number; height: number }; category: string }>
  systems: { eventActionTypes: string[]; linkageTypes: string[]; containerTypes: string[]; variableTypes: string[] }
}

// ────────────────────────────────────────────
// 动态加载 metadata
// ────────────────────────────────────────────

let metadata: AIMetadata | null = null

async function getMetadata(): Promise<AIMetadata> {
  if (!metadata) {
    // 从 shared/ai/metadata.json 读取（构建时自动生成）
    const { readFileSync } = await import('node:fs')
    const { join, dirname } = await import('node:path')
    // 通过 package.json 定位 shared/ai 目录
    const pkgPath = require.resolve('@schema-form/shared-ai/package.json')
    const aiDir = dirname(pkgPath)
    const jsonPath = join(aiDir, 'metadata.json')
    metadata = JSON.parse(readFileSync(jsonPath, 'utf-8')) as AIMetadata
  }
  return metadata
}

export async function getWidgetCatalogueFromMetadata(): Promise<WidgetAIMetadata[]> {
  const meta = await getMetadata()
  return meta.widgets
}

// ────────────────────────────────────────────
// Tool result type
// ────────────────────────────────────────────

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  /** 自然语言摘要，LLM 可直接引用 */
  summary?: string
}

// ────────────────────────────────────────────
// LangGraph tools
// ────────────────────────────────────────────

export const searchSchemasTool = tool(
  async ({ keyword, type, limit }): Promise<ToolResult> => {
    const filter: Record<string, unknown> = {}
    if (keyword) {
      filter.name = { $regex: escapeRegex(keyword), $options: 'i' }
    }
    if (type) {
      filter.type = type
    }

    const schemas = await FormSchemaModel.find(filter)
      .select('_id editId name type status version createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()

    const mapped = schemas.map((s: Record<string, unknown>) => ({
      id: s._id,
      editId: s.editId,
      name: s.name,
      type: s.type,
      status: s.status,
      version: s.version,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))

    const summary = schemas.length === 0
      ? `没有找到${keyword ? `包含"${keyword}"的` : ''}Schema`
      : `找到 ${schemas.length} 个 Schema：${mapped.slice(0, 3).map((s: Record<string, unknown>) => `${s.name}（${s.type}，${s.status}）`).join('、')}${schemas.length > 3 ? '等' : ''}`

    return {
      success: true,
      data: { total: schemas.length, schemas: mapped },
      summary,
    }
  },
  {
    name: 'search_schemas',
    description: '搜索已有的表单 Schema 列表。可用于查找现有 Schema 作为参考、查找用户想修改的 Schema、或检查是否已存在同名 Schema。',
    schema: z.object({
      keyword: z.string().optional().describe('按名称模糊搜索的关键词'),
      type: z.enum(['form', 'search_list']).optional().describe('按类型筛选'),
      limit: z.number().optional().default(10).describe('返回数量上限，默认 10'),
    }),
  },
)

export const getSchemaDetailTool = tool(
  async ({ schemaId }): Promise<ToolResult> => {
    const schema = await FormSchemaModel.findById(schemaId).lean() as Record<string, unknown> | null
    if (!schema) {
      return { success: false, error: `Schema ${schemaId} not found` }
    }

    const widgetCount = Array.isArray(schema.json) ? (schema.json as unknown[]).length : 0

    return {
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
    }
  },
  {
    name: 'get_schema_detail',
    description: '获取指定 Schema 的完整 JSON 内容，包括所有 Widget 配置。用于深入了解现有 Schema 结构以便修改。',
    schema: z.object({
      schemaId: z.string().describe('Schema 的 _id'),
    }),
  },
)

export const searchPublishedSchemasTool = tool(
  async ({ keyword, limit }): Promise<ToolResult> => {
    const filter: Record<string, unknown> = {}
    if (keyword) {
      filter.name = { $regex: escapeRegex(keyword), $options: 'i' }
    }

    const schemas = await PublishedSchemaModel.find(filter)
      .select('_id sourceId name type publishId version publishedAt')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean()

    const mapped = schemas.map((s: Record<string, unknown>) => ({
      id: s._id,
      sourceId: s.sourceId,
      name: s.name,
      type: s.type,
      publishId: s.publishId,
      version: s.version,
      publishedAt: s.publishedAt,
    }))

    const summary = schemas.length === 0
      ? '没有找到已发布的 Schema'
      : `找到 ${schemas.length} 个已发布 Schema：${mapped.slice(0, 3).map((s: Record<string, unknown>) => `${s.name}（v${s.version}）`).join('、')}${schemas.length > 3 ? '等' : ''}`

    return {
      success: true,
      data: { total: schemas.length, schemas: mapped },
      summary,
    }
  },
  {
    name: 'search_published_schemas',
    description: '搜索已发布的 Schema 版本。可用于查找可复用的已发布模板。',
    schema: z.object({
      keyword: z.string().optional().describe('按名称模糊搜索'),
      limit: z.number().optional().default(10).describe('返回数量上限，默认 10'),
    }),
  },
)

export const getWidgetCatalogueTool = tool(
  async ({ category }): Promise<ToolResult> => {
    const widgets = await getWidgetCatalogueFromMetadata()

    const filtered = category
      ? widgets.filter((w) => w.group === category)
      : widgets

    const groupLabel = category ? `${category} 分组` : '全部'
    const summary = `${groupLabel}共 ${filtered.length} 个组件：${filtered.slice(0, 5).map(w => w.displayName).join('、')}${filtered.length > 5 ? '等' : ''}`

    return {
      success: true,
      data: { total: filtered.length, widgets: filtered },
      summary,
    }
  },
  {
    name: 'get_widget_catalogue',
    description: '获取 Widget 组件目录，包含所有可用组件类型及其关键属性。可按分类筛选。',
    schema: z.object({
      category: z.enum(['container', 'layout', 'form', 'static', 'action', 'table', 'business', 'chart'])
        .optional()
        .describe('按组件分类筛选，不传则返回全部'),
    }),
  },
)

export const searchWidgetsByKeywordTool = tool(
  async ({ query, limit }): Promise<ToolResult> => {
    // 提取查询关键词（中文分词 + 英文分词）
    const queryTokens = extractTokens(query)

    // 获取所有 Schema（限制 100 个，避免全表扫描）
    const schemas = await FormSchemaModel.find()
      .select('_id editId name type status version json createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean()

    // 计算每个 Schema 的相似度分数（基于 Jaccard 关键词匹配）
    const scored = schemas.map((schema: Record<string, unknown>) => {
      const nameTokens = extractTokens(String(schema.name ?? ''))
      // 从 json 中提取组件类型和字段名作为特征
      const jsonTokens = extractTokensFromSchema(schema.json)
      const allTokens = new Set([...nameTokens, ...jsonTokens])

      const score = jaccardSimilarity(queryTokens, allTokens)
      return { schema, score }
    })

    // 按分数排序，取 top N
    scored.sort((a, b) => b.score - a.score)
    const results = scored.slice(0, limit).filter((s) => s.score > 0)

    const mapped = results.map((r) => ({
      id: r.schema._id,
      editId: r.schema.editId,
      name: r.schema.name,
      type: r.schema.type,
      status: r.schema.status,
      version: r.schema.version,
      score: Math.round(r.score * 100),
      createdAt: r.schema.createdAt,
      updatedAt: r.schema.updatedAt,
    }))

    const summary = mapped.length === 0
      ? `没有找到与"${query}"相关的 Schema`
      : `找到 ${mapped.length} 个相关 Schema：${mapped.slice(0, 3).map((s) => `${String(s.name)}（匹配度 ${s.score}%）`).join('、')}`

    return {
      success: true,
      data: { total: mapped.length, schemas: mapped },
      summary,
    }
  },
  {
    name: 'search_widgets_by_keyword',
    description: '基于关键词匹配搜索已有 Schema。使用 Jaccard 相似度匹配 Schema 名称和组件结构中的关键词，不支持语义理解。当用户描述模糊、需要按组件类型或功能特征查找时使用。',
    schema: z.object({
      query: z.string().describe('关键词描述，如"请假申请表单"、"用户管理列表页"'),
      limit: z.number().optional().default(5).describe('返回数量上限，默认 5'),
    }),
  },
)

export const validateSchemaTool = tool(
  async ({ widgets }): Promise<ToolResult> => {
    const meta = await getMetadata()
    const VALID_TYPES = new Set(meta.widgets.map((w) => w.type))
    const CONTAINER_TYPES = new Set(
      meta.widgets.filter((w) => w.canHaveChildren).map((w) => w.type),
    )

    interface ValidationError {
      path: string
      message: string
    }

    const errors: ValidationError[] = []

    function walk(nodes: Record<string, unknown>[], prefix: string, depth: number): void {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const path = prefix ? `${prefix}[${i}]` : `[${i}]`

        const type = node.type as string | undefined
        if (!type) {
          errors.push({ path: `${path}.type`, message: '缺少 type 字段' })
          continue
        }
        if (!VALID_TYPES.has(type)) {
          errors.push({ path: `${path}.type`, message: `无效的组件类型 "${type}"` })
          continue
        }

        const id = node.id as string | undefined
        if (!id) {
          errors.push({ path: `${path}.id`, message: '缺少 id 字段' })
        }

        const isContainer = CONTAINER_TYPES.has(type)
        const children = node.children as Record<string, unknown>[] | undefined

        if (isContainer) {
          if (!Array.isArray(children)) {
            errors.push({ path: `${path}.children`, message: `容器组件 "${type}" 必须有 children 数组` })
          } else {
            walk(children, path, depth + 1)
          }
        } else if (depth === 0 && !isContainer) {
          errors.push({ path, message: `基础组件 "${type}" 必须嵌套在布局容器内` })
        }
      }
    }

    walk(widgets as Record<string, unknown>[], '', 0)

    const summary = errors.length === 0
      ? `Schema 校验通过，共 ${(widgets as unknown[]).length} 个组件`
      : `Schema 校验失败，${errors.length} 个错误：${errors.slice(0, 3).map(e => e.message).join('；')}${errors.length > 3 ? '等' : ''}`

    return {
      success: true,
      data: { valid: errors.length === 0, errors },
      summary,
    }
  },
  {
    name: 'validate_schema',
    description: '校验 Widget Schema JSON 的结构正确性。在生成 Schema 后调用此工具确认无误再返回给用户。',
    schema: z.object({
      widgets: z.array(z.record(z.unknown())).describe('要校验的 Widget 数组'),
    }),
  },
)

// ────────────────────────────────────────────
// Exported tool array for ToolNode
// ────────────────────────────────────────────

export const editorTools = [
  searchSchemasTool,
  getSchemaDetailTool,
  searchPublishedSchemasTool,
  getWidgetCatalogueTool,
  searchWidgetsByKeywordTool,
  validateSchemaTool,
]

// ────────────────────────────────────────────
// Utilities (shared with other modules)
// ────────────────────────────────────────────

/** 中文 + 英文分词 */
function extractTokens(text: string): Set<string> {
  const tokens = new Set<string>()

  // 英文单词
  const englishWords = text.match(/[a-zA-Z]+/g) ?? []
  for (const word of englishWords) {
    tokens.add(word.toLowerCase())
  }

  // 中文：按字符 bigram
  const chineseChars = text.match(/[一-鿿]+/g) ?? []
  for (const segment of chineseChars) {
    for (let i = 0; i < segment.length - 1; i++) {
      tokens.add(segment.slice(i, i + 2))
    }
    if (segment.length > 0) tokens.add(segment)
  }

  return tokens
}

/** 从 Schema JSON 中提取特征 tokens */
function extractTokensFromSchema(json: unknown): Set<string> {
  const tokens = new Set<string>()
  if (!Array.isArray(json)) return tokens

  function walk(nodes: Record<string, unknown>[]): void {
    for (const node of nodes) {
      if (node.type) tokens.add(String(node.type))
      if (node.field) tokens.add(String(node.field))
      if (node.label) {
        for (const t of extractTokens(String(node.label))) {
          tokens.add(t)
        }
      }
      if (Array.isArray(node.children)) {
        walk(node.children as Record<string, unknown>[])
      }
    }
  }

  walk(json as Record<string, unknown>[])
  return tokens
}

/** Jaccard 相似度 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let intersection = 0
  for (const item of a) {
    if (b.has(item)) intersection++
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}
