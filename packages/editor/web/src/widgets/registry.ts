import type { SchemaType, Widget, WidgetConfig } from './base/types'
import type { Component } from 'vue'

/** Widget 注册项 */
export interface WidgetRegistryItem {
  /** 组件名称 */
  name: string
  /** 显示名称 */
  displayName: string
  /** 组件类型 */
  type: SchemaType
  /** 分组 */
  group: 'layout' | 'form' | 'container' | 'table' | 'action' | 'static' | 'business' | 'chart'
  /** Vue 组件 */
  component: Component
  /** 创建 Widget 的工厂函数 */
  create: (id: string) => Widget
  /** 组件配置 */
  config: WidgetConfig
}

/** Widget 注册表 */
const registry = new Map<SchemaType, WidgetRegistryItem>()

/** 注册 Widget */
export function registerWidget(item: WidgetRegistryItem): void {
  registry.set(item.type, item)
}

/** 获取 Widget 注册项 */
export function getWidget(type: SchemaType): WidgetRegistryItem | undefined {
  return registry.get(type)
}

/** 获取所有已注册的 Widget */
export function getAllWidgets(): WidgetRegistryItem[] {
  return Array.from(registry.values())
}

/** 按分组获取 Widget */
export function getWidgetsByGroup(group: WidgetRegistryItem['group']): WidgetRegistryItem[] {
  return Array.from(registry.values()).filter(w => w.group === group)
}

/** Cached component map — registry is static after initialization */
let _cachedComponentMap: Record<string, Component> | null = null

/** 获取组件映射表（用于 SchemaRender），带缓存 */
export function getComponentMap(): Record<string, Component> {
  if (!_cachedComponentMap) {
    const map: Record<string, Component> = {}
    for (const [type, item] of registry) {
      map[type] = item.component
    }
    _cachedComponentMap = map
  }
  return _cachedComponentMap
}

/** 创建 Widget 实例 */
export function createWidget(type: SchemaType, id: string): Widget | null {
  const item = registry.get(type)
  if (!item) return null
  return item.create(id)
}

/** 生成 Widget ID */
export function generateWidgetId(type: SchemaType): string {
  const hash = Math.random().toString(36).substring(2, 7)
  return `${type}_${hash}`
}
