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
  'grid-row',
  'grid-col',
  'page',
  'toolbar',
  'card',
  'steps',
  'tabs',
  'single-col',
  'double-col',
  'triple-col',
  'quad-col',
])

/** 编辑器中可接受拖放的容器类型 */
export const EDITABLE_CONTAINER_TYPES: ReadonlySet<SchemaType> = new Set([
  'card',
  'page',
  'toolbar',
  'grid-row',
  'grid-col',
  'steps',
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

/** 布局/容器组件（单一数据源：所有布局类组件类型） */
export const LAYOUT_TYPES: ReadonlySet<SchemaType> = new Set([
  'grid-row', 'grid-col',
  'page', 'toolbar', 'card', 'title', 'divider', 'spacer', 'steps', 'tabs', 'dialog',
  'single-col', 'double-col', 'triple-col', 'quad-col',
])

/** 基础组件 */
export const BASIC_TYPES: ReadonlySet<SchemaType> = new Set([
  'input', 'number', 'select', 'radio', 'checkbox', 'date', 'date-range',
  'textarea', 'richtext',
  'toolbar-buttons', 'button', 'table', 'pagination',
])

/** 业务组件（不参与本次重构） */
export const BUSINESS_TYPES: ReadonlySet<SchemaType> = new Set([
  'upload', 'file-list', 'transfer',
  'banner', 'tree-layout', 'date-time-slot',
  'toolbar-buttons', 'search-list', 'editable-table',
])
