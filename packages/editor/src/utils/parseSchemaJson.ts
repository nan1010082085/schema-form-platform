/**
 * parseSchemaJson — 解析 schema JSON 字段
 *
 * 支持两种格式：
 * - 新格式：{ widgets: Widget[], board: { canvas, variables, events } }
 * - 旧格式：直接是 Widget[]
 */
import type { Widget } from '../widgets/base/types'

interface BoardConfig {
  canvas?: Record<string, unknown>
  variables?: unknown[]
  events?: unknown[]
}

interface ParseResult {
  widgets: Widget[]
  boardConfig: BoardConfig
}

export function parseSchemaJson(json: unknown): ParseResult {
  if (json && typeof json === 'object' && 'widgets' in json && 'board' in json) {
    const data = json as { widgets: Widget[]; board: BoardConfig }
    return { widgets: data.widgets || [], boardConfig: data.board || {} }
  }
  return { widgets: (json as Widget[]) || [], boardConfig: {} }
}
