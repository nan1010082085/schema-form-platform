import type { WidgetConfig } from '../base/types'

export const gaugeConfig: WidgetConfig = {
  name: 'FgGauge',
  displayName: '仪表盘',
  description: '仪表盘组件，用于展示单个指标的完成度',
  author: 'yangdongnan',
  defaultStyle: { width: '100%', height: '400px' },
  defaultProps: {
    staticData: [
      { value: 75 },
    ] as Record<string, unknown>[],
    valueField: 'value',
    min: 0,
    max: 100,
    unit: '',
    title: '',
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
        { key: 'value', label: '值', type: 'number' },
      ]},
      { key: 'valueField', label: '值字段', type: 'text', placeholder: '如: value' },
      { key: 'min', label: '最小值', type: 'number', default: 0 },
      { key: 'max', label: '最大值', type: 'number', default: 100 },
      { key: 'unit', label: '单位', type: 'text', placeholder: '如: %' },
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
