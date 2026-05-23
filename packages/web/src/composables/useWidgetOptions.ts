/**
 * useWidgetOptions — 从 widget store 提取所有部件 ID 生成选项列表
 *
 * 用于属性面板中需要选择部件 ID 的场景（如联动 targetFields、事件绑定等）。
 * 返回响应式 options 数组，store 变化时自动更新。
 */
import { computed } from 'vue'
import { useWidgetStore } from '@/stores/widget'
import type { Widget } from '@/widgets/base/types'

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

export function useWidgetOptions() {
  const widgetStore = useWidgetStore()

  const widgetOptions = computed(() => flattenWidgets(widgetStore.widgets))

  return { widgetOptions }
}
