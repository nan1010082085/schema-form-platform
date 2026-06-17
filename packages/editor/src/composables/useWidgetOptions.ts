/**
 * useWidgetOptions — 从 widget store 提取所有部件 ID 生成选项列表
 *
 * 用于属性面板中需要选择部件 ID 的场景（如联动 targetFields、事件绑定等）。
 * 返回响应式 options 数组，store 变化时自动更新。
 */
import { computed } from 'vue'
import { useWidgetStore } from '@/stores/widget'
import type { Widget, SchemaType } from '@/widgets/base/types'

export interface WidgetOption {
  label: string
  value: string
}

function flattenWidgets(list: Widget[]): WidgetOption[] {
  const result: WidgetOption[] = []
  for (const w of list) {
    if (w.field) {
      const label = w.label || w.name || w.field || w.type
      result.push({ label: `${label}（${w.field}）`, value: w.field })
    }
    if (w.children?.length) {
      result.push(...flattenWidgets(w.children))
    }
  }
  return result
}

/** 容器类型 */
const CONTAINER_TYPES: Set<SchemaType> = new Set([
  'form', 'card', 'tabs', 'dialog',
  'single-col', 'double-col', 'triple-col', 'quad-col',
])

/** 弹窗类型 */
const DIALOG_TYPES: Set<SchemaType> = new Set(['dialog'])

/** 页签类型 */
const TABS_TYPES: Set<SchemaType> = new Set(['tabs'])

/** 表单字段类型（有 field 属性） */
function hasField(w: Widget): boolean {
  return !!w.field
}

export function useWidgetOptions() {
  const widgetStore = useWidgetStore()

  const widgetOptions = computed(() => flattenWidgets(widgetStore.widgets))

  /** 所有组件选项（含无 field 的组件，按 ID 选择） */
  const allWidgetOptions = computed(() => {
    const result: WidgetOption[] = []
    function collect(list: Widget[]) {
      for (const w of list) {
        const label = w.label || w.name || w.type
        result.push({ label: `${label}（${w.id}）`, value: w.id })
        if (w.children?.length) collect(w.children)
      }
    }
    collect(widgetStore.widgets)
    return result
  })

  /** 可显示/隐藏的组件（非根级容器） */
  const showHideOptions = computed(() => {
    const result: WidgetOption[] = []
    function collect(list: Widget[], isRoot: boolean) {
      for (const w of list) {
        // 跳过根级容器（form、card 等）
        if (isRoot && CONTAINER_TYPES.has(w.type)) {
          if (w.children?.length) collect(w.children, false)
          continue
        }
        const label = w.label || w.name || w.type
        result.push({ label: `${label}（${w.id}）`, value: w.id })
        if (w.children?.length) collect(w.children, false)
      }
    }
    collect(widgetStore.widgets, true)
    return result
  })

  /** 可打开的弹窗组件 */
  const dialogOptions = computed(() => {
    const result: WidgetOption[] = []
    function collect(list: Widget[]) {
      for (const w of list) {
        if (DIALOG_TYPES.has(w.type)) {
          const label = w.label || w.name || w.type
          result.push({ label: `${label}（${w.id}）`, value: w.id })
        }
        if (w.children?.length) collect(w.children)
      }
    }
    collect(widgetStore.widgets)
    return result
  })

  /** 可切换页签的 tabs 组件 */
  const tabsOptions = computed(() => {
    const result: WidgetOption[] = []
    function collect(list: Widget[]) {
      for (const w of list) {
        if (TABS_TYPES.has(w.type)) {
          const label = w.label || w.name || w.type
          result.push({ label: `${label}（${w.id}）`, value: w.id })
        }
        if (w.children?.length) collect(w.children)
      }
    }
    collect(widgetStore.widgets)
    return result
  })

  /** 可设置值的表单字段组件 */
  const setValueOptions = computed(() => {
    const result: WidgetOption[] = []
    function collect(list: Widget[]) {
      for (const w of list) {
        if (hasField(w)) {
          const label = w.label || w.name || w.field || w.type
          result.push({ label: `${label}（${w.field}）`, value: w.id })
        }
        if (w.children?.length) collect(w.children)
      }
    }
    collect(widgetStore.widgets)
    return result
  })

  /** 可触发事件的组件（排除容器） */
  const triggerEventOptions = computed(() => {
    const result: WidgetOption[] = []
    function collect(list: Widget[]) {
      for (const w of list) {
        if (!CONTAINER_TYPES.has(w.type)) {
          const label = w.label || w.name || w.type
          result.push({ label: `${label}（${w.id}）`, value: w.id })
        }
        if (w.children?.length) collect(w.children)
      }
    }
    collect(widgetStore.widgets)
    return result
  })

  return {
    widgetOptions,
    allWidgetOptions,
    showHideOptions,
    dialogOptions,
    tabsOptions,
    setValueOptions,
    triggerEventOptions,
  }
}
