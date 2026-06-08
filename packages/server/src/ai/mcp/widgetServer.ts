/**
 * Widget MCP Server — 通过 MCP 协议暴露 Widget 工具。
 *
 * 使用共享 schemaService 层的 validateWidgetSchema。
 * 工具名使用 widget__ 前缀实现命名空间隔离。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { validateWidgetSchema } from '../services/schemaService.js'

// ── AI metadata types ──

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
    version: '2.0.0',
  })

  // ── widget__query ──
  server.tool(
    'widget__query',
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

  // ── widget__validate ──
  server.tool(
    'widget__validate',
    '校验 Widget Schema JSON 的结构正确性。检查类型合法性、ID 存在性、position 完整性、容器嵌套规则等。',
    {
      widgets: z.array(z.record(z.unknown())).describe('要校验的 Widget 数组'),
    },
    async ({ widgets }) => {
      const result = await validateWidgetSchema(widgets)
      const summary = result.valid
        ? `Schema 校验通过，共 ${widgets.length} 个组件`
        : `Schema 校验失败，${result.errors.length} 个错误：${result.errors.slice(0, 3).map((e) => e.message).join('；')}${result.errors.length > 3 ? '等' : ''}`

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            data: { valid: result.valid, errors: result.errors },
            summary,
          }),
        }],
      }
    },
  )

  return server
}
