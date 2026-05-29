import type { WidgetConfig } from '../base/types'

export const pieChartConfig: WidgetConfig = {
  name: 'FgPieChart',
  displayName: '饼图',
  description: '饼图组件，支持玫瑰图、环形图',
  author: 'yangdongnan',
  defaultStyle: { width: '100%', height: '400px' },
  defaultProps: {
    staticData: [
      { name: '直接访问', value: 335 },
      { name: '邮件营销', value: 310 },
      { name: '联盟广告', value: 234 },
      { name: '视频广告', value: 135 },
      { name: '搜索引擎', value: 548 },
    ] as Record<string, unknown>[],
    nameField: 'name',
    valueField: 'value',
    title: '',
    showLegend: true,
    showLabel: false,
    colorScheme: 'default',
    roseType: false,
    innerRadius: '',
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
    props: [
      { key: 'nameField', label: '名称字段', type: 'input', placeholder: '如: name' },
      { key: 'valueField', label: '值字段', type: 'input', placeholder: '如: value' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: false },
      { key: 'roseType', label: '玫瑰图', type: 'switch', default: false },
      { key: 'innerRadius', label: '内环半径', type: 'input', placeholder: '如: 40%' },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
