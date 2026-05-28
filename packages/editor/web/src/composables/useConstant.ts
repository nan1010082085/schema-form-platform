/**
 * useConstant — 全局常量集中管理
 *
 * 消除项目中的魔法数字/字符串，统一引用。
 */
import type { SchemaType } from '@/components/WidgetRenderer/types'

/** 编辑历史最大快照数 */
export const MAX_HISTORY_SIZE = 10

/** 组件 ID Hash 长度 */
export const ID_HASH_LENGTH = 5

/** 可容纳子节点的布局容器类型 */
export const LAYOUT_CONTAINER_TYPES: ReadonlySet<SchemaType> = new Set([
  'card',
  'tabs',
  'single-col',
  'double-col',
  'triple-col',
  'quad-col',
])

/** 编辑器中可接受拖放的容器类型 */
export const EDITABLE_CONTAINER_TYPES: ReadonlySet<SchemaType> = new Set([
  'card',
  'tabs',
  'single-col',
  'double-col',
  'triple-col',
  'quad-col',
])

/** 交互模式 */
export const INTERACTION_MODES = ['edit', 'preview', 'publish-interactive', 'publish-readonly'] as const

export type InteractionMode = (typeof INTERACTION_MODES)[number]

/**
 * 判断组件类型是否为可嵌套容器
 */
export function canNest(type: SchemaType): boolean {
  return LAYOUT_CONTAINER_TYPES.has(type)
}

/** 布局/容器组件（layout + container 分组） */
export const LAYOUT_TYPES: ReadonlySet<SchemaType> = new Set([
  'card', 'tabs', 'single-col', 'double-col', 'triple-col', 'quad-col',
  'divider', 'spacer',
  'form', 'dialog',
])

/** 表单控件 + 操作按钮 + 静态展示 + 表格（form + action + static + table 分组） */
export const BASIC_TYPES: ReadonlySet<SchemaType> = new Set([
  'input', 'number', 'select', 'radio', 'checkbox', 'date', 'textarea',
  'richtext', 'upload', 'date-time-slot',
  'button', 'toolbar-buttons',
  'title', 'banner',
  'table', 'search-list', 'editable-table',
])

/** 业务组件（business 分组） */
export const BUSINESS_TYPES: ReadonlySet<SchemaType> = new Set([
  'tree-layout', 'file-list', 'transfer',
])
