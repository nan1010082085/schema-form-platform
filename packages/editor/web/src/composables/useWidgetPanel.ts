import { computed } from 'vue'
import { getWidgetsByGroup, type WidgetRegistryItem } from '../widgets/registry'

export interface WidgetPanelGroup {
  label: string
  key: WidgetRegistryItem['group']
  items: WidgetRegistryItem[]
}

/** 组件面板数据源 */
export function useWidgetPanel() {
  const groups = computed<WidgetPanelGroup[]>(() => [
    { label: '布局组件', key: 'layout' as const, items: getWidgetsByGroup('layout') },
    { label: '表单组件', key: 'form' as const, items: getWidgetsByGroup('form') },
    { label: '容器组件', key: 'container' as const, items: getWidgetsByGroup('container') },
    { label: '表格组件', key: 'table' as const, items: getWidgetsByGroup('table') },
    { label: '操作组件', key: 'action' as const, items: getWidgetsByGroup('action') },
    { label: '静态组件', key: 'static' as const, items: getWidgetsByGroup('static') },
    { label: '业务组件', key: 'business' as const, items: getWidgetsByGroup('business') },
    { label: '图表组件', key: 'chart' as const, items: getWidgetsByGroup('chart') },
  ].filter(g => g.items.length > 0))

  return { groups }
}
