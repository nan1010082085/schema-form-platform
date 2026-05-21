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
    { label: '容器组件', key: 'container', items: getWidgetsByGroup('container') },
    { label: '基础组件', key: 'basic', items: getWidgetsByGroup('basic') },
    { label: '表单组件', key: 'form', items: getWidgetsByGroup('form') },
    { label: '表格组件', key: 'table', items: getWidgetsByGroup('table') },
    { label: '业务组件', key: 'business', items: getWidgetsByGroup('business') },
  ].filter(g => g.items.length > 0))

  return { groups }
}
