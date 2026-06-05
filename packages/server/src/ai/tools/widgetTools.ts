/**
 * Widget domain knowledge and validation — LangGraph StructuredTool format.
 *
 * 从 @schema-form/shared-ai metadata 动态读取组件目录，
 * 不再维护硬编码副本。
 */

import { tool } from '@langchain/core/tools'
import { getWidgetCatalogueFromMetadata } from './editorTools.js'
import { z } from 'zod'

// ────────────────────────────────────────────
// Tool result types
// ────────────────────────────────────────────

interface QueryWidgetsResult {
  total: number
  widgets: Awaited<ReturnType<typeof getWidgetCatalogueFromMetadata>>
}

interface ValidationError {
  path: string
  message: string
}

interface ValidateSchemaResult {
  valid: boolean
  errors: ValidationError[]
}

// ────────────────────────────────────────────
// Direct utility exports (backward compatibility)
// ────────────────────────────────────────────

/**
 * Returns the full Widget type catalogue, optionally filtered by category.
 */
export async function queryWidgets(category?: string): Promise<QueryWidgetsResult> {
  const allWidgets = await getWidgetCatalogueFromMetadata()
  const filtered = category
    ? allWidgets.filter((w) => w.group === category)
    : allWidgets

  return { total: filtered.length, widgets: filtered }
}

/**
 * Validates a Widget[] tree for structural correctness.
 * 类型集合从 metadata 动态获取，新增 Widget 自动覆盖。
 */
export async function validateSchema(widgets: Record<string, unknown>[]): Promise<ValidateSchemaResult> {
  const metaWidgets = await getWidgetCatalogueFromMetadata()
  const VALID_TYPES = new Set(metaWidgets.map((w) => w.type))
  const CONTAINER_TYPES = new Set(metaWidgets.filter((w) => w.canHaveChildren).map((w) => w.type))

  const errors: ValidationError[] = []

  function walk(nodes: Record<string, unknown>[], prefix: string, depth: number): void {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const path = prefix ? `${prefix}[${i}]` : `[${i}]`

      // type check
      const type = node.type as string | undefined
      if (!type) {
        errors.push({ path: `${path}.type`, message: 'Widget is missing required "type" field.' })
        continue
      }
      if (!VALID_TYPES.has(type)) {
        errors.push({ path: `${path}.type`, message: `Invalid widget type "${type}".` })
        continue
      }

      // id check
      const id = node.id as string | undefined
      if (!id) {
        errors.push({ path: `${path}.id`, message: 'Widget is missing required "id" field.' })
      }

      // position check
      const pos = node.position as Record<string, unknown> | undefined
      if (!pos || typeof pos !== 'object') {
        errors.push({ path: `${path}.position`, message: 'Widget is missing required "position" field.' })
      } else {
        for (const key of ['x', 'y', 'w', 'h']) {
          if (typeof pos[key] !== 'number' || (pos[key] as number) < 0) {
            errors.push({ path: `${path}.position.${key}`, message: `position.${key} must be a non-negative number.` })
          }
        }
      }

      // children rules
      const isContainer = CONTAINER_TYPES.has(type)
      const children = node.children as Record<string, unknown>[] | undefined

      if (isContainer) {
        if (!Array.isArray(children)) {
          errors.push({ path: `${path}.children`, message: `Container widget "${type}" must have a children array.` })
        } else {
          walk(children, path, depth + 1)
        }
      } else if (depth === 0 && !isContainer) {
        // Top-level non-container — violation of the nesting rule
        errors.push({
          path,
          message: `Basic/static widget "${type}" must be nested inside a layout container.`,
        })
      }
    }
  }

  walk(widgets, '', 0)
  return { valid: errors.length === 0, errors }
}

// ────────────────────────────────────────────
// LangGraph tools
// ────────────────────────────────────────────

export const queryWidgetsTool = tool(
  async ({ category }): Promise<string> => {
    const result = await queryWidgets(category)
    return JSON.stringify(result)
  },
  {
    name: 'query_widgets',
    description: `获取 Widget 组件目录，包含所有可用组件类型及其关键属性（defaultProps、keyProps、exposedValues 等）。可按分类筛选。

参数：category — 组件分类（container/layout/form/static/action/table/business/chart），不传返回全部。
返回 JSON 包含 total 数量和 widgets 数组。`,
    schema: z.object({
      category: z.enum(['container', 'layout', 'form', 'static', 'action', 'table', 'business', 'chart'])
        .optional()
        .describe('按组件分类筛选，不传则返回全部'),
    }),
  },
)

export const validateWidgetSchemaTool = tool(
  async ({ widgets }): Promise<string> => {
    const result = await validateSchema(widgets as Record<string, unknown>[])
    return JSON.stringify(result)
  },
  {
    name: 'validate_widget_schema',
    description: `校验 Widget Schema JSON 的结构正确性。检查类型合法性、ID 存在性、position 完整性、容器嵌套规则等。

参数：widgets — 要校验的 Widget 数组。
返回 JSON 包含 valid 布尔值和 errors 错误列表（每项含 path 和 message）。`,
    schema: z.object({
      widgets: z.array(z.record(z.unknown())).describe('要校验的 Widget 数组'),
    }),
  },
)

// ────────────────────────────────────────────
// Exported tool array
// ────────────────────────────────────────────

export const widgetTools = [
  queryWidgetsTool,
  validateWidgetSchemaTool,
]
