/**
 * useConstant — 全局常量集中管理
 *
 * 消除项目中的魔法数字/字符串，统一引用。
 * 容器类型从 registry 动态获取，支持新增部件自动适配。
 */
import { computed } from 'vue'
import type { SchemaType } from '@/components/WidgetRenderer/types'
import { getAllWidgets, type WidgetRegistryItem } from '@/widgets/registry'

/** 编辑历史最大快照数 */
export const MAX_HISTORY_SIZE = 10

/** 组件 ID Hash 长度 */
export const ID_HASH_LENGTH = 5

/**
 * 从 registry 动态获取容器类型集合
 * container 分组的 widget 都是容器
 */
function getContainerTypesFromRegistry(): Set<SchemaType> {
  const types = new Set<SchemaType>()
  for (const item of getAllWidgets()) {
    if (item.group === 'container' || item.group === 'layout') {
      types.add(item.type)
    }
  }
  return types
}

/** 可容纳子节点的布局容器类型（动态） */
export function useLayoutContainerTypes(): ReadonlySet<SchemaType> {
  return computed(() => getContainerTypesFromRegistry())
}

/** 编辑器中可接受拖放的容器类型（动态） */
export function useEditableContainerTypes(): ReadonlySet<SchemaType> {
  return computed(() => getContainerTypesFromRegistry())
}

/** 交互模式 */
export const INTERACTION_MODES = ['edit', 'preview', 'publish-interactive', 'publish-readonly'] as const

export type InteractionMode = (typeof INTERACTION_MODES)[number]

/**
 * 判断组件类型是否为可嵌套容器（动态）
 */
export function canNest(type: SchemaType): boolean {
  return getContainerTypesFromRegistry().has(type)
}

/**
 * 获取所有容器类型（静态缓存，用于非响应式场景）
 * 注意：此函数每次调用都会遍历所有 widgets，建议在非频繁调用场景使用
 */
export function useAllContainerTypes(): Set<SchemaType> {
  return getContainerTypesFromRegistry()
}

/** @deprecated 使用 useAllContainerTypes 替代 */
export const getAllContainerTypes = useAllContainerTypes

/** 布局/容器组件（layout + container 分组，动态） */
export function useLayoutTypes(): ReadonlySet<SchemaType> {
  return computed(() => {
    const types = new Set<SchemaType>()
    for (const item of getAllWidgets()) {
      if (item.group === 'layout' || item.group === 'container') {
        types.add(item.type)
      }
    }
    return types
  })
}

/** 表单控件 + 操作按钮 + 静态展示 + 表格（动态） */
export function useBasicTypes(): ReadonlySet<SchemaType> {
  return computed(() => {
    const types = new Set<SchemaType>()
    for (const item of getAllWidgets()) {
      if (['form', 'action', 'static', 'table'].includes(item.group)) {
        types.add(item.type)
      }
    }
    return types
  })
}

/** 业务组件（business 分组，动态） */
export function useBusinessTypes(): ReadonlySet<SchemaType> {
  return computed(() => {
    const types = new Set<SchemaType>()
    for (const item of getAllWidgets()) {
      if (item.group === 'business') {
        types.add(item.type)
      }
    }
    return types
  })
}

/**
 * 获取指定分组的所有组件类型
 */
export function useTypesByGroup(group: WidgetRegistryItem['group']): Set<SchemaType> {
  const types = new Set<SchemaType>()
  for (const item of getAllWidgets()) {
    if (item.group === group) {
      types.add(item.type)
    }
  }
  return types
}

/** @deprecated 使用 useTypesByGroup 替代 */
export const getTypesByGroup = useTypesByGroup
