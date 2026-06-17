import type { WidgetConfig } from '../base/types'

export const horizontalBarChartConfig: WidgetConfig = {
  name: 'FgHorizontalBarChart',
  displayName: '水平柱状图',
  type: 'horizontal-bar-chart',
  description: '水平柱状图，适合展示排名数据',
  author: 'yangdongnan',
  defaultStyle: { width: '100%', height: '400px' },
  defaultProps: {
    staticData: [
      { category: '产品A', value: 335 },
      { category: '产品B', value: 310 },
      { category: '产品C', value: 234 },
      { category: '产品D', value: 135 },
      { category: '产品E', value: 548 },
    ] as Record<string, unknown>[],
    xField: 'category',
    yField: 'value',
    xAxisName: '',
    yAxisName: '',
    title: '',
    showLegend: false,
    showTooltip: true,
    showLabel: true,
    colorScheme: 'default',
    customColors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'] as string[],
    animation: true,
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
        { key: 'category', label: '分类', type: 'text' },
        { key: 'value', label: '值', type: 'number' },
      ]},
      { key: 'xField', label: '分类字段', type: 'text', placeholder: '如: category' },
      { key: 'yField', label: '值字段', type: 'text', placeholder: '如: value' },
      { key: 'title', label: '图表标题', type: 'text' },
      { key: 'showTooltip', label: '显示提示', type: 'switch', default: true },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: true },
      { key: 'animation', label: '动画', type: 'switch', default: true },
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
