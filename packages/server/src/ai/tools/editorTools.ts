/**
 * Editor Agent tools — LangGraph StructuredTool format.
 *
 * Widget 目录从 @schema-form/shared-ai 动态读取，
 * 新增 Widget 后重新运行提取脚本即可自动覆盖。
 */

import { tool } from '@langchain/core/tools'
import { interrupt } from '@langchain/langgraph'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { PublishedSchemaModel } from '../../models/PublishedSchema.js'
import { escapeRegex } from '../graph/agentBase.js'
import { z } from 'zod'
import type { ToolResult } from './types.js'

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
// LangGraph tools
// ────────────────────────────────────────────

export const getSchemaDetailTool = tool(
  async ({ schemaId }): Promise<string> => {
    const schema = await FormSchemaModel.findById(schemaId).lean() as Record<string, unknown> | null
    if (!schema) {
      return JSON.stringify({ success: false, error: `Schema ${schemaId} not found` } satisfies ToolResult)
    }

    const widgetCount = Array.isArray(schema.json) ? (schema.json as unknown[]).length : 0

    const result: ToolResult = {
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
    return JSON.stringify(result)
  },
  {
    name: 'get_schema_detail',
    description: `获取指定 Schema 的完整 JSON 内容，包括所有 Widget 配置。用于深入了解现有 Schema 结构以便修改。

参数：schemaId — Schema 的 _id（UUID 字符串）。
返回 JSON 包含 Schema 完整信息：id、name、type、status、version、json（Widget 树）、时间戳。`,
    schema: z.object({
      schemaId: z.string().describe('Schema 的 _id'),
    }),
  },
)

export const searchPublishedSchemasTool = tool(
  async ({ keyword, limit }): Promise<string> => {
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

    const result: ToolResult = {
      success: true,
      data: { total: schemas.length, schemas: mapped },
      summary,
    }
    return JSON.stringify(result)
  },
  {
    name: 'search_published_schemas',
    description: `搜索已发布的 Schema 版本。可用于查找可复用的已发布模板。

参数：keyword — 按名称模糊搜索；limit — 返回数量上限，默认 10。
返回 JSON 包含 total 数量和 schemas 数组（含 sourceId、publishId、version、publishedAt）。`,
    schema: z.object({
      keyword: z.string().optional().describe('按名称模糊搜索'),
      limit: z.number().optional().default(10).describe('返回数量上限，默认 10'),
    }),
  },
)

export const getWidgetCatalogueTool = tool(
  async ({ category }): Promise<string> => {
    const widgets = await getWidgetCatalogueFromMetadata()

    const filtered = category
      ? widgets.filter((w) => w.group === category)
      : widgets

    const groupLabel = category ? `${category} 分组` : '全部'
    const summary = `${groupLabel}共 ${filtered.length} 个组件：${filtered.slice(0, 5).map(w => w.displayName).join('、')}${filtered.length > 5 ? '等' : ''}`

    const result: ToolResult = {
      success: true,
      data: { total: filtered.length, widgets: filtered },
      summary,
    }
    return JSON.stringify(result)
  },
  {
    name: 'get_widget_catalogue',
    description: `获取 Widget 组件目录，包含所有可用组件类型及其关键属性（defaultProps、keyProps、exposedValues、receivableEvents 等）。可按分类筛选。

参数：category — 组件分类（container/layout/form/static/action/table/business/chart），不传返回全部。
返回 JSON 包含 total 数量和 widgets 数组，每个 widget 含 type、group、displayName、description、defaultProps、keyProps 等完整元数据。`,
    schema: z.object({
      category: z.enum(['container', 'layout', 'form', 'static', 'action', 'table', 'business', 'chart'])
        .optional()
        .describe('按组件分类筛选，不传则返回全部'),
    }),
  },
)

export const searchWidgetsByKeywordTool = tool(
  async ({ query, limit }): Promise<string> => {
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

    const result: ToolResult = {
      success: true,
      data: { total: mapped.length, schemas: mapped },
      summary,
    }
    return JSON.stringify(result)
  },
  {
    name: 'fuzzy_search_schemas',
    description: `基于关键词模糊搜索已有 Schema（非语义搜索，使用 Jaccard 相似度匹配名称和组件结构中的关键词）。当用户描述模糊、需要按组件类型或功能特征查找时使用。

参数：query — 关键词描述（如"请假申请表单"）；limit — 返回数量上限，默认 5。
返回 JSON 包含 schemas 数组，每个元素含匹配度 score（百分比）。`,
    schema: z.object({
      query: z.string().describe('关键词描述，如"请假申请表单"、"用户管理列表页"'),
      limit: z.number().optional().default(5).describe('返回数量上限，默认 5'),
    }),
  },
)

export const validateSchemaTool = tool(
  async ({ widgets }): Promise<string> => {
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

    const result: ToolResult = {
      success: true,
      data: { valid: errors.length === 0, errors },
      summary,
    }
    return JSON.stringify(result)
  },
  {
    name: 'validate_schema',
    description: `校验 Widget Schema JSON 的结构正确性。检查组件类型合法性、ID 存在性、容器嵌套规则。在生成 Schema 后调用此工具确认无误再返回给用户。

参数：widgets — 要校验的 Widget 数组。
返回 JSON 包含 valid 布尔值和 errors 错误列表（每项含 path 和 message）。`,
    schema: z.object({
      widgets: z.array(z.record(z.unknown())).describe('要校验的 Widget 数组'),
    }),
  },
)

// ────────────────────────────────────────────
// Exported tool array for ToolNode
// ────────────────────────────────────────────

export const findFlowReferencesTool = tool(
  async ({ schemaId }): Promise<string> => {
    // 动态导入避免循环依赖
    const { FlowVersionModel } = await import('../../flow-models/FlowVersion.js')
    const { FlowDefinitionModel } = await import('../../flow-models/FlowDefinition.js')

    // 在所有 FlowVersion 的 graph.nodes 中查找引用了该 schemaId 的节点
    const versions = await FlowVersionModel.find({
      'graph.nodes.data.formSchemaId': schemaId,
    })
      .select('_id definitionId version graph.nodes')
      .lean()

    const refs: Array<{
      flowId: string
      flowName: string
      versionId: string
      version: string
      nodeId: string
      nodeLabel: string
      bpmnType: string
    }> = []

    for (const ver of versions) {
      const verData = ver as unknown as Record<string, unknown>
      const graph = verData.graph as Record<string, unknown> | undefined
      const definitionId = verData.definitionId as string

      const def = await FlowDefinitionModel.findById(definitionId)
        .select('_id name')
        .lean() as Record<string, unknown> | null

      const nodes = (graph?.nodes ?? []) as Array<Record<string, unknown>>
      for (const node of nodes) {
        const data = node.data as Record<string, unknown> | undefined
        if (data?.formSchemaId === schemaId) {
          refs.push({
            flowId: definitionId,
            flowName: (def?.name as string) ?? 'Unknown',
            versionId: verData._id as string,
            version: verData.version as string,
            nodeId: node.id as string,
            nodeLabel: (data.label as string) ?? (node.id as string),
            bpmnType: (data.bpmnType as string) ?? 'unknown',
          })
        }
      }
    }

    const summary = refs.length === 0
      ? '没有流程节点引用此 Schema'
      : `找到 ${refs.length} 个流程节点引用此 Schema：${refs.slice(0, 3).map(r => `${r.flowName}/${r.nodeLabel}`).join('、')}${refs.length > 3 ? '等' : ''}`

    const result: ToolResult = {
      success: true,
      data: { total: refs.length, references: refs },
      summary,
    }
    return JSON.stringify(result)
  },
  {
    name: 'find_flow_references',
    description: `查找引用了指定 Schema 的所有流程节点。用于了解一个 Schema 被哪些流程的哪些节点使用，实现 Schema → Flow 的反向关联查询。

参数：schemaId — Schema 的 _id。
返回 JSON 包含 references 数组，每项含 flowId、flowName、nodeId、nodeLabel、bpmnType。`,
    schema: z.object({
      schemaId: z.string().describe('Schema 的 _id'),
    }),
  },
)

// ────────────────────────────────────────────
// Schema Diff Computation
// ────────────────────────────────────────────

interface SchemaDiffEntry {
  type: 'add' | 'remove' | 'modify'
  widgetId: string
  widgetType: string
  path: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  summary: string
}

interface SchemaDiff {
  changes: SchemaDiffEntry[]
  added: number
  removed: number
  modified: number
}

/**
 * Build a map of widgetId → { widget, path } from a widget tree.
 */
function indexWidgets(
  widgets: Record<string, unknown>[],
  parentPath = '',
): Map<string, { widget: Record<string, unknown>; path: string }> {
  const map = new Map<string, { widget: Record<string, unknown>; path: string }>()
  for (let i = 0; i < widgets.length; i++) {
    const w = widgets[i]
    const id = w.id as string
    const path = parentPath ? `${parentPath}[${i}]` : `[${i}]`
    if (id) {
      map.set(id, { widget: w, path })
    }
    if (Array.isArray(w.children)) {
      for (const [childId, entry] of indexWidgets(
        w.children as Record<string, unknown>[],
        path,
      )) {
        map.set(childId, entry)
      }
    }
  }
  return map
}

/**
 * Compute a structural diff between two Widget[] schemas.
 *
 * Compares by widget id: detects added, removed, and modified widgets.
 * For modified widgets, reports which top-level props changed.
 */
export function computeSchemaDiff(
  oldWidgets: Record<string, unknown>[],
  newWidgets: Record<string, unknown>[],
): SchemaDiff {
  const oldMap = indexWidgets(oldWidgets)
  const newMap = indexWidgets(newWidgets)

  const changes: SchemaDiffEntry[] = []
  let added = 0
  let removed = 0
  let modified = 0

  // Detect removed widgets
  for (const [id, { widget, path }] of oldMap) {
    if (!newMap.has(id)) {
      removed++
      changes.push({
        type: 'remove',
        widgetId: id,
        widgetType: (widget.type as string) ?? 'unknown',
        path,
        before: widget,
        summary: `删除了 ${widget.type ?? '未知'} 组件（${widget.label ?? id}）`,
      })
    }
  }

  // Detect added and modified widgets
  for (const [id, { widget, path }] of newMap) {
    const oldEntry = oldMap.get(id)
    if (!oldEntry) {
      added++
      changes.push({
        type: 'add',
        widgetId: id,
        widgetType: (widget.type as string) ?? 'unknown',
        path,
        after: widget,
        summary: `新增了 ${widget.type ?? '未知'} 组件（${widget.label ?? id}）`,
      })
    } else {
      // Compare top-level props (skip children, position which are structural)
      const changedProps: string[] = []
      const SKIP_KEYS = new Set(['children', 'position', 'events', 'linkages', 'variables', 'lifecycle'])
      const allKeys = new Set([...Object.keys(oldEntry.widget), ...Object.keys(widget)])
      for (const key of allKeys) {
        if (SKIP_KEYS.has(key)) continue
        const oldVal = JSON.stringify(oldEntry.widget[key])
        const newVal = JSON.stringify(widget[key])
        if (oldVal !== newVal) {
          changedProps.push(key)
        }
      }

      if (changedProps.length > 0) {
        modified++
        changes.push({
          type: 'modify',
          widgetId: id,
          widgetType: (widget.type as string) ?? 'unknown',
          path,
          before: oldEntry.widget,
          after: widget,
          summary: `修改了 ${widget.type ?? '未知'} 组件的 ${changedProps.join('、')} 属性`,
        })
      }
    }
  }

  return { changes, added, removed, modified }
}

// ────────────────────────────────────────────
// Update Schema Tool
// ────────────────────────────────────────────

export const updateSchemaTool = tool(
  async ({ widgets, schemaId, description }): Promise<string> => {
    // 1. Validate the new schema
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

    if (errors.length > 0) {
      return JSON.stringify({
        success: false,
        error: `Schema 校验失败，${errors.length} 个错误：${errors.slice(0, 3).map(e => e.message).join('；')}`,
      } satisfies ToolResult)
    }

    // 2. Compute diff against existing schema
    let diff: SchemaDiff | null = null
    if (schemaId) {
      const existing = await FormSchemaModel.findById(schemaId)
        .select('json')
        .lean() as Record<string, unknown> | null

      if (existing && Array.isArray(existing.json)) {
        diff = computeSchemaDiff(
          existing.json as Record<string, unknown>[],
          widgets as Record<string, unknown>[],
        )
      }
    }

    // 3. Human-in-the-Loop: confirm before write operation
    const diffSummary = diff
      ? `变更：新增 ${diff.added} 个组件，删除 ${diff.removed} 个，修改 ${diff.modified} 个`
      : `Schema 包含 ${(widgets as unknown[]).length} 个组件`

    const confirmed = interrupt({
      type: 'schema_update',
      message: `确认更新 Schema？${diffSummary}`,
      data: {
        schemaId,
        description,
        diff: diff ? {
          added: diff.added,
          removed: diff.removed,
          modified: diff.modified,
          changes: diff.changes.slice(0, 10),
        } : null,
        widgetCount: (widgets as unknown[]).length,
      },
    })

    if (!confirmed) {
      return JSON.stringify({
        success: false,
        error: '用户取消操作',
      } satisfies ToolResult)
    }

    // 4. Save version (version creation is handled by route handler)
    if (schemaId) {
      // Update existing schema
      const { v4: uuidv4 } = await import('uuid')
      const now = new Date()
      const version = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
      ].join('')

      await FormSchemaModel.findByIdAndUpdate(schemaId, {
        json: widgets,
        version,
        updatedAt: now,
      })

      // Also update PublishedSchema
      const schema = await FormSchemaModel.findById(schemaId)
        .select('editId name type')
        .lean() as Record<string, unknown> | null
      if (schema) {
        const { PublishedSchemaModel } = await import('../../models/PublishedSchema.js')
        const publishId = uuidv4()
        await PublishedSchemaModel.create({
          _id: uuidv4(),
          sourceId: schema.editId,
          publishId,
          name: schema.name,
          type: schema.type,
          json: widgets,
          version,
          publishedAt: now,
        })
      }
    }

    const result: ToolResult = {
      success: true,
      data: {
        widgets,
        schemaId,
        diff,
        description,
      },
      summary: diffSummary,
    }
    return JSON.stringify(result)
  },
  {
    name: 'update_schema',
    description: `增量更新已有的 Schema。基于用户的反馈修改当前 Schema，只变更需要修改的部分。

使用场景：
- 用户说"把标题改成xxx"、"加一个输入框"、"删除那个按钮"
- 用户对已生成的 Schema 提出修改意见
- 多轮迭代优化 Schema

工作流程：
1. 在上下文中获取当前 Schema
2. 理解用户的修改需求
3. 生成修改后的完整 Schema（保持未修改部分不变）
4. 调用此工具提交更新

工具会自动计算 diff 并保存版本历史。`,
    schema: z.object({
      widgets: z.array(z.record(z.unknown())).describe('修改后的完整 Widget Schema JSON 数组'),
      schemaId: z.string().optional().describe('要更新的 Schema ID。如果不提供则创建新 Schema'),
      description: z.string().describe('本次修改的自然语言描述，如"添加了手机号输入框"'),
    }),
  },
)

export const editorTools = [
  getSchemaDetailTool,
  searchPublishedSchemasTool,
  getWidgetCatalogueTool,
  searchWidgetsByKeywordTool,
  validateSchemaTool,
  findFlowReferencesTool,
  updateSchemaTool,
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
