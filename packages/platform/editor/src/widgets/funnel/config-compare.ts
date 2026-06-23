import type { WidgetConfig } from '../base/types'

export const compareFunnelConfig: WidgetConfig = {
  name: 'FgCompareFunnel',
  displayName: '对比漏斗图',
  type: 'compare-funnel',
  description: '对比漏斗图，用于展示两个流程的转化对比',
  author: 'yangdongnan',
  defaultStyle: { width: '100%', height: '400px' },
  defaultProps: {
    staticData: [
      { name: '展示', value1: 100, value2: 100 },
      { name: '点击', value1: 80, value2: 70 },
      { name: '访问', value1: 60, value2: 50 },
      { name: '咨询', value1: 40, value2: 30 },
      { name: '订单', value1: 20, value2: 15 },
    ] as Record<string, unknown>[],
    nameField: 'name',
    seriesFields: ['value1', 'value2'],
    seriesNames: ['流程A', '流程B'],
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
        { key: 'value1', label: '流程A', type: 'number' },
        { key: 'value2', label: '流程B', type: 'number' },
      ]},
      { key: 'nameField', label: '名称字段', type: 'text', placeholder: '如: name' },
      { key: 'seriesFields', label: '系列字段 (JSON)', type: 'json', placeholder: '["value1", "value2"]' },
      { key: 'seriesNames', label: '系列名称 (JSON)', type: 'json', placeholder: '["流程A", "流程B"]' },
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
