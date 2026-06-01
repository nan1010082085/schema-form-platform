/**
 * Editor Agent tools — OpenAI function calling format.
 *
 * Provides schema search, widget catalogue, and validation capabilities
 * for the Editor Agent to query real data during generation.
 */

import { v4 as uuidv4, validate as uuidValidate } from 'uuid'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { PublishedSchemaModel } from '../../models/PublishedSchema.js'
import { escapeRegex } from '../graph/agentBase.js'

// ────────────────────────────────────────────
// OpenAI tool definitions
// ────────────────────────────────────────────

export const EDITOR_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_schemas',
      description: '搜索已有的表单 Schema 列表。可用于查找现有 Schema 作为参考、查找用户想修改的 Schema、或检查是否已存在同名 Schema。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '按名称模糊搜索的关键词' },
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
      name: 'get_schema_detail',
      description: '获取指定 Schema 的完整 JSON 内容，包括所有 Widget 配置。用于深入了解现有 Schema 结构以便修改。',
      parameters: {
        type: 'object',
        properties: {
          schemaId: { type: 'string', description: 'Schema 的 _id' },
        },
        required: ['schemaId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_published_schemas',
      description: '搜索已发布的 Schema 版本。可用于查找可复用的已发布模板。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '按名称模糊搜索' },
          limit: { type: 'number', description: '返回数量上限，默认 10' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_widget_catalogue',
      description: '获取 Widget 组件目录，包含所有可用组件类型及其关键属性。可按分类筛选。',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['container', 'layout', 'form', 'static', 'action', 'table', 'business', 'chart'],
            description: '按组件分类筛选，不传则返回全部',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'validate_schema',
      description: '校验 Widget Schema JSON 的结构正确性。在生成 Schema 后调用此工具确认无误再返回给用户。',
      parameters: {
        type: 'object',
        properties: {
          widgets: {
            type: 'array',
            description: '要校验的 Widget 数组',
            items: { type: 'object' },
          },
        },
        required: ['widgets'],
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

export async function executeEditorTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name) {
    case 'search_schemas':
      return searchSchemas(args)
    case 'get_schema_detail':
      return getSchemaDetail(args)
    case 'search_published_schemas':
      return searchPublishedSchemas(args)
    case 'get_widget_catalogue':
      return getWidgetCatalogue(args)
    case 'validate_schema':
      return validateSchemaTool(args)
    default:
      return { success: false, error: `Unknown tool: ${name}` }
  }
}

// ────────────────────────────────────────────
// Implementations
// ────────────────────────────────────────────

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
    .select('_id editId name type status version createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()

  return {
    success: true,
    data: {
      total: schemas.length,
      schemas: schemas.map((s: Record<string, unknown>) => ({
        id: s._id,
        editId: s.editId,
        name: s.name,
        type: s.type,
        status: s.status,
        version: s.version,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    },
  }
}

async function getSchemaDetail(args: Record<string, unknown>): Promise<ToolResult> {
  const schemaId = args.schemaId as string
  if (!schemaId) {
    return { success: false, error: 'schemaId is required' }
  }

  const schema = await FormSchemaModel.findById(schemaId).lean() as Record<string, unknown> | null
  if (!schema) {
    return { success: false, error: `Schema ${schemaId} not found` }
  }

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
  }
}

async function searchPublishedSchemas(args: Record<string, unknown>): Promise<ToolResult> {
  const keyword = args.keyword as string | undefined
  const limit = (args.limit as number) || 10

  const filter: Record<string, unknown> = {}
  if (keyword) {
    filter.name = { $regex: escapeRegex(keyword), $options: 'i' }
  }

  const schemas = await PublishedSchemaModel.find(filter)
    .select('_id sourceId name type publishId version publishedAt')
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean()

  return {
    success: true,
    data: {
      total: schemas.length,
      schemas: schemas.map((s: Record<string, unknown>) => ({
        id: s._id,
        sourceId: s.sourceId,
        name: s.name,
        type: s.type,
        publishId: s.publishId,
        version: s.version,
        publishedAt: s.publishedAt,
      })),
    },
  }
}

interface WidgetTypeInfo {
  type: string
  category: string
  description: string
  keyProps: string[]
  canHaveChildren: boolean
}

export const WIDGET_CATALOGUE: WidgetTypeInfo[] = [
  // Container
  { type: 'form', category: 'container', description: '表单容器', keyProps: ['labelWidth', 'labelPosition'], canHaveChildren: true },
  { type: 'dialog', category: 'container', description: '弹窗容器', keyProps: ['title', 'width', 'contentMode', 'draggable', 'showFooter'], canHaveChildren: true },
  // Layout
  { type: 'card', category: 'layout', description: '卡片容器', keyProps: ['title', 'shadow'], canHaveChildren: true },
  { type: 'tabs', category: 'layout', description: '标签页容器', keyProps: ['type', 'tabPosition', 'editable'], canHaveChildren: true },
  { type: 'single-col', category: 'layout', description: '单列布局', keyProps: ['colWidths', 'gutter'], canHaveChildren: true },
  { type: 'double-col', category: 'layout', description: '双列布局', keyProps: ['colWidths', 'gutter'], canHaveChildren: true },
  { type: 'triple-col', category: 'layout', description: '三列布局', keyProps: ['colWidths', 'gutter'], canHaveChildren: true },
  { type: 'quad-col', category: 'layout', description: '四列布局', keyProps: ['colWidths', 'gutter'], canHaveChildren: true },
  { type: 'divider', category: 'layout', description: '分割线', keyProps: ['direction'], canHaveChildren: false },
  { type: 'spacer', category: 'layout', description: '间距', keyProps: ['height'], canHaveChildren: false },
  // Form
  { type: 'input', category: 'form', description: '文本输入', keyProps: ['placeholder', 'maxlength', 'showWordLimit', 'clearable'], canHaveChildren: false },
  { type: 'number', category: 'form', description: '数字输入', keyProps: ['min', 'max', 'step', 'precision'], canHaveChildren: false },
  { type: 'select', category: 'form', description: '下拉选择', keyProps: ['multiple', 'filterable', 'clearable'], canHaveChildren: false },
  { type: 'radio', category: 'form', description: '单选框组', keyProps: [], canHaveChildren: false },
  { type: 'checkbox', category: 'form', description: '复选框组', keyProps: [], canHaveChildren: false },
  { type: 'date', category: 'form', description: '日期选择', keyProps: ['type', 'format', 'valueFormat'], canHaveChildren: false },
  { type: 'textarea', category: 'form', description: '多行文本', keyProps: ['rows', 'autosize'], canHaveChildren: false },
  { type: 'switch', category: 'form', description: '开关', keyProps: ['activeText', 'inactiveText', 'activeValue', 'inactiveValue'], canHaveChildren: false },
  { type: 'slider', category: 'form', description: '滑块', keyProps: ['min', 'max', 'step', 'showStops', 'range'], canHaveChildren: false },
  { type: 'rate', category: 'form', description: '评分', keyProps: ['max', 'allowHalf', 'showText', 'texts'], canHaveChildren: false },
  { type: 'richtext', category: 'form', description: '富文本', keyProps: ['toolbar'], canHaveChildren: false },
  { type: 'upload', category: 'form', description: '文件上传', keyProps: ['action', 'accept', 'multiple', 'limit', 'listType'], canHaveChildren: false },
  { type: 'date-time-slot', category: 'form', description: '时间段', keyProps: [], canHaveChildren: false },
  { type: 'time-picker', category: 'form', description: '时间选择', keyProps: ['isRange', 'format'], canHaveChildren: false },
  { type: 'cascader', category: 'form', description: '级联选择', keyProps: ['props'], canHaveChildren: false },
  { type: 'color-picker', category: 'form', description: '颜色选择', keyProps: ['showAlpha', 'predefine'], canHaveChildren: false },
  { type: 'tag-input', category: 'form', description: '标签输入', keyProps: [], canHaveChildren: false },
  { type: 'autocomplete', category: 'form', description: '自动补全', keyProps: [], canHaveChildren: false },
  // Static
  { type: 'title', category: 'static', description: '标题', keyProps: ['text', 'level'], canHaveChildren: false },
  { type: 'banner', category: 'static', description: '横幅提示', keyProps: ['text', 'type', 'closable'], canHaveChildren: false },
  // Action
  { type: 'button', category: 'action', description: '单个按钮', keyProps: ['text', 'type', 'icon', 'size'], canHaveChildren: false },
  { type: 'toolbar-buttons', category: 'action', description: '工具栏按钮组', keyProps: ['buttons'], canHaveChildren: false },
  // Table
  { type: 'table', category: 'table', description: '数据表格', keyProps: ['columns', 'pagination', 'border', 'stripe'], canHaveChildren: false },
  { type: 'editable-table', category: 'table', description: '可编辑表格', keyProps: ['columns', 'addable', 'deletable'], canHaveChildren: false },
  { type: 'search-list', category: 'table', description: '搜索列表页', keyProps: ['searchFields', 'columns', 'listApi', 'rowActions'], canHaveChildren: false },
  // Business
  { type: 'tree-layout', category: 'business', description: '树形布局', keyProps: ['direction'], canHaveChildren: true },
  { type: 'file-list', category: 'business', description: '文件列表', keyProps: ['editable'], canHaveChildren: false },
  { type: 'transfer', category: 'business', description: '穿梭框', keyProps: ['data', 'filterable'], canHaveChildren: false },
  // Chart
  { type: 'bar-chart', category: 'chart', description: '柱状图', keyProps: ['xAxis', 'yAxis', 'series'], canHaveChildren: false },
  { type: 'line-chart', category: 'chart', description: '折线图', keyProps: ['xAxis', 'yAxis', 'series', 'smooth'], canHaveChildren: false },
  { type: 'pie-chart', category: 'chart', description: '饼图', keyProps: ['series', 'radius'], canHaveChildren: false },
  { type: 'scatter-chart', category: 'chart', description: '散点图', keyProps: ['xAxis', 'yAxis'], canHaveChildren: false },
  { type: 'radar', category: 'chart', description: '雷达图', keyProps: ['indicator', 'series'], canHaveChildren: false },
  { type: 'gauge', category: 'chart', description: '仪表盘', keyProps: ['min', 'max', 'series'], canHaveChildren: false },
  { type: 'heatmap', category: 'chart', description: '热力图', keyProps: ['xAxis', 'yAxis', 'series'], canHaveChildren: false },
  { type: 'funnel', category: 'chart', description: '漏斗图', keyProps: ['series'], canHaveChildren: false },
  { type: 'candlestick', category: 'chart', description: 'K线图', keyProps: ['xAxis', 'series'], canHaveChildren: false },
]

const VALID_TYPES = new Set(WIDGET_CATALOGUE.map((w) => w.type))
const CONTAINER_TYPES = new Set(
  WIDGET_CATALOGUE.filter((w) => w.canHaveChildren).map((w) => w.type),
)

function getWidgetCatalogue(args: Record<string, unknown>): ToolResult {
  const category = args.category as string | undefined
  const filtered = category
    ? WIDGET_CATALOGUE.filter((w) => w.category === category)
    : WIDGET_CATALOGUE

  return {
    success: true,
    data: { total: filtered.length, widgets: filtered },
  }
}

interface ValidationError {
  path: string
  message: string
}

function validateSchemaTool(args: Record<string, unknown>): ToolResult {
  const widgets = args.widgets as Record<string, unknown>[]
  if (!Array.isArray(widgets)) {
    return { success: false, error: 'widgets must be an array' }
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

  walk(widgets, '', 0)

  return {
    success: true,
    data: { valid: errors.length === 0, errors },
  }
}
