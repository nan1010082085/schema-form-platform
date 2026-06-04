import type { WidgetConfig } from '../base/types'

export const barChartConfig: WidgetConfig = {
  name: 'FgBarChart',
  displayName: '柱状图',
  description: '柱状图组件，支持堆叠、水平方向',
  author: 'yangdongnan',
  defaultStyle: { width: '100%', height: '400px' },
  defaultProps: {
    staticData: [
      { category: '1月', value: 120 },
      { category: '2月', value: 200 },
      { category: '3月', value: 150 },
      { category: '4月', value: 80 },
      { category: '5月', value: 170 },
    ] as Record<string, unknown>[],
    xField: 'category',
    yField: 'value',
    title: '',
    showLegend: true,
    showLabel: false,
    colorScheme: 'default',
    stack: false,
    horizontal: false,
    apiUrl: '',
    apiMethod: 'get',
    apiHeaders: {} as Record<string, string>,
    responseDataPath: '',
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
      { key: 'xField', label: 'X 轴字段', type: 'input', placeholder: '如: category' },
      { key: 'yField', label: 'Y 轴字段', type: 'input', placeholder: '如: value' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: false },
      { key: 'stack', label: '堆叠', type: 'switch', default: false },
      { key: 'horizontal', label: '水平方向', type: 'switch', default: false },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
