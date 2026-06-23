import type { WidgetConfig } from '../base/types'

export const heatmapConfig: WidgetConfig = {
  name: 'FgHeatmap',
  displayName: '热力图',
  description: '热力图组件，用于展示二维数据密度',
  author: 'yangdongnan',
  defaultStyle: { width: '100%', height: '400px' },
  defaultProps: {
    staticData: [
      { x: 0, y: 0, value: 5 }, { x: 0, y: 1, value: 1 }, { x: 0, y: 2, value: 0 },
      { x: 1, y: 0, value: 7 }, { x: 1, y: 1, value: 3 }, { x: 1, y: 2, value: 1 },
      { x: 2, y: 0, value: 2 }, { x: 2, y: 1, value: 4 }, { x: 2, y: 2, value: 6 },
    ] as Record<string, unknown>[],
    xField: 'x',
    yField: 'y',
    valueField: 'value',
    title: '',
    showLabel: false,
    colorScheme: 'default',
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
        { key: 'x', label: 'X', type: 'number' },
        { key: 'y', label: 'Y', type: 'number' },
        { key: 'value', label: '值', type: 'number' },
      ]},
      { key: 'xField', label: 'X 轴字段', type: 'text', placeholder: '如: x' },
      { key: 'yField', label: 'Y 轴字段', type: 'text', placeholder: '如: y' },
      { key: 'valueField', label: '值字段', type: 'text', placeholder: '如: value' },
      { key: 'title', label: '图表标题', type: 'text' },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: false },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
