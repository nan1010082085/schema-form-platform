import type { WidgetConfig } from '../base/types'

export const funnelConfig: WidgetConfig = {
  name: 'FgFunnel',
  displayName: '漏斗图',
  description: '漏斗图组件，用于展示转化流程各阶段数据',
  author: 'yangdongnan',
  defaultStyle: { width: '100%', height: '400px' },
  defaultProps: {
    staticData: [
      { name: '展示', value: 100 },
      { name: '点击', value: 80 },
      { name: '访问', value: 60 },
      { name: '咨询', value: 40 },
      { name: '订单', value: 20 },
    ] as Record<string, unknown>[],
    nameField: 'name',
    valueField: 'value',
    title: '',
    showLegend: true,
    showLabel: true,
    colorScheme: 'default',
    customColors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'] as string[],
    rawOption: null as Record<string, unknown> | null,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'chartData', type: 'array', description: '图表数据' },
  ],
  configPanels: ['api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载数据' },
    { name: 'set-data', description: '设置图表数据', params: { data: '数据数组' } },
  ],
  propertyPanel: {
    basic: ['label'],
    style: ['margin', 'padding', 'backgroundColor', 'borderRadius'],
    props: [
      { key: 'staticData', label: '静态数据', type: 'array-editor', fields: [
        { key: 'name', label: '名称', type: 'text' },
        { key: 'value', label: '值', type: 'number' },
      ]},
      { key: 'nameField', label: '名称字段', type: 'text', placeholder: '如: name' },
      { key: 'valueField', label: '值字段', type: 'text', placeholder: '如: value' },
      { key: 'title', label: '图表标题', type: 'text' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: true },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'customColors', label: '自定义颜色', type: 'color-array' },
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
