/**
 * useWidgetOptions — 从 widget store 提取所有部件 ID 生成选项列表
 *
 * 用于属性面板中需要选择部件 ID 的场景（如联动 targetFields、事件绑定等）。
 * 返回响应式 options 数组，store 变化时自动更新。
 * 容器类型从 registry 动态获取，支持新增部件自动适配。
 */
import { computed } from 'vue'
import { useWidgetStore } from '@/stores/widget'
import type { Widget } from '@/widgets/base/types'
import { getAllContainerTypes, getTypesByGroup } from '@/composables/useConstant'

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

  /** 可显示/隐藏的组件（非根级容器，动态获取容器类型） */
  const showHideOptions = computed(() => {
    const containerTypes = getAllContainerTypes()
    const result: WidgetOption[] = []
    function collect(list: Widget[], isRoot: boolean) {
      for (const w of list) {
        // 跳过根级容器
        if (isRoot && containerTypes.has(w.type)) {
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

  /** 可打开的弹窗组件（动态获取 dialog 类型） */
  const dialogOptions = computed(() => {
    const dialogTypes = getTypesByGroup('container')
    const result: WidgetOption[] = []
    function collect(list: Widget[]) {
      for (const w of list) {
        if (w.type === 'dialog') {
          const label = w.label || w.name || w.type
          result.push({ label: `${label}（${w.id}）`, value: w.id })
        }
        if (w.children?.length) collect(w.children)
      }
    }
    collect(widgetStore.widgets)
    return result
  })

  /** 可切换页签的 tabs 组件（动态获取 tabs 类型） */
  const tabsOptions = computed(() => {
    const result: WidgetOption[] = []
    function collect(list: Widget[]) {
      for (const w of list) {
        if (w.type === 'tabs') {
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

  /** 可触发事件的组件（排除容器，动态获取容器类型） */
  const triggerEventOptions = computed(() => {
    const containerTypes = getAllContainerTypes()
    const result: WidgetOption[] = []
    function collect(list: Widget[]) {
      for (const w of list) {
        if (!containerTypes.has(w.type)) {
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
