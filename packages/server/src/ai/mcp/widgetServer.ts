/**
 * Widget MCP Server — exposes Widget catalogue and validation tools via MCP protocol.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

// ── AI metadata types (aligned with @schema-form/shared-ai) ──

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
}

// ── Metadata cache ──

let metadata: AIMetadata | null = null

function getMetadata(): AIMetadata {
  if (!metadata) {
    const pkgPath = require.resolve('@schema-form/shared-ai/package.json')
    const aiDir = dirname(pkgPath)
    const jsonPath = join(aiDir, 'metadata.json')
    metadata = JSON.parse(readFileSync(jsonPath, 'utf-8')) as AIMetadata
  }
  return metadata
}

export function createWidgetServer(): McpServer {
  const server = new McpServer({
    name: 'schema-form-widgets',
    version: '1.0.0',
  })

  // ── query_widgets ──
  server.tool(
    'query_widgets',
    '获取 Widget 组件目录，包含所有可用组件类型及其关键属性。可按分类筛选。',
    {
      category: z.enum(['container', 'layout', 'form', 'static', 'action', 'table', 'business', 'chart'])
        .optional()
        .describe('按组件分类筛选，不传则返回全部'),
    },
    async ({ category }) => {
      const meta = getMetadata()
      const filtered = category
        ? meta.widgets.filter((w) => w.group === category)
        : meta.widgets

      const groupLabel = category ? `${category} 分组` : '全部'
      const summary = `${groupLabel}共 ${filtered.length} 个组件：${filtered.slice(0, 5).map((w) => w.displayName).join('、')}${filtered.length > 5 ? '等' : ''}`

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            data: { total: filtered.length, widgets: filtered },
            summary,
          }),
        }],
      }
    },
  )

  // ── validate_widget_schema ──
  server.tool(
    'validate_widget_schema',
    '校验 Widget Schema JSON 的结构正确性。检查类型合法性、ID 存在性、position 完整性、容器嵌套规则等。',
    {
      widgets: z.array(z.record(z.unknown())).describe('要校验的 Widget 数组'),
    },
    async ({ widgets }) => {
      const meta = getMetadata()
      const VALID_TYPES = new Set(meta.widgets.map((w) => w.type))
      const CONTAINER_TYPES = new Set(meta.widgets.filter((w) => w.canHaveChildren).map((w) => w.type))

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

          const pos = node.position as Record<string, unknown> | undefined
          if (!pos || typeof pos !== 'object') {
            errors.push({ path: `${path}.position`, message: '缺少 position 字段' })
          } else {
            for (const key of ['x', 'y', 'w', 'h']) {
              if (typeof pos[key] !== 'number' || (pos[key] as number) < 0) {
                errors.push({ path: `${path}.position.${key}`, message: `position.${key} 必须为非负数` })
              }
            }
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

      const summary = errors.length === 0
        ? `Schema 校验通过，共 ${widgets.length} 个组件`
        : `Schema 校验失败，${errors.length} 个错误：${errors.slice(0, 3).map((e) => e.message).join('；')}${errors.length > 3 ? '等' : ''}`

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
