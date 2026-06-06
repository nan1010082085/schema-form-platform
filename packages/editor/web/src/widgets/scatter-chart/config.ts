import type { WidgetConfig } from '../base/types'

export const scatterChartConfig: WidgetConfig = {
  name: 'FgScatterChart',
  displayName: '散点图',
  description: '散点图组件，用于展示两个变量之间的关系',
  author: 'yangdongnan',
  defaultStyle: { width: '100%', height: '400px' },
  defaultProps: {
    staticData: [
      { x: 10, y: 8.04 }, { x: 8, y: 6.95 }, { x: 13, y: 7.58 },
      { x: 9, y: 8.81 }, { x: 11, y: 8.33 }, { x: 14, y: 9.96 },
      { x: 6, y: 7.24 }, { x: 4, y: 4.26 }, { x: 12, y: 10.84 },
      { x: 7, y: 4.82 }, { x: 5, y: 5.68 },
    ] as Record<string, unknown>[],
    xField: 'x',
    yField: 'y',
    xAxisName: '',
    yAxisName: '',
    title: '',
    showLegend: true,
    legendPosition: 'bottom',
    showTooltip: true,
    showLabel: false,
    colorScheme: 'default',
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
        { key: 'x', label: 'X 值', type: 'number' },
        { key: 'y', label: 'Y 值', type: 'number' },
      ]},
      { key: 'xField', label: 'X 轴字段', type: 'text', placeholder: '如: x' },
      { key: 'yField', label: 'Y 轴字段', type: 'text', placeholder: '如: y' },
      { key: 'xAxisName', label: 'X 轴名称', type: 'text', placeholder: '可选' },
      { key: 'yAxisName', label: 'Y 轴名称', type: 'text', placeholder: '可选' },
      { key: 'title', label: '图表标题', type: 'text' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
      { key: 'legendPosition', label: '图例位置', type: 'select', default: 'bottom', options: [
        { label: '顶部', value: 'top' },
        { label: '底部', value: 'bottom' },
        { label: '左侧', value: 'left' },
        { label: '右侧', value: 'right' },
      ]},
      { key: 'showTooltip', label: '显示提示', type: 'switch', default: true },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: false },
      { key: 'animation', label: '动画', type: 'switch', default: true },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
