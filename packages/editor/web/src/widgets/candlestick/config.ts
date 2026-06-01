import type { WidgetConfig } from '../base/types'

export const candlestickConfig: WidgetConfig = {
  name: 'FgCandlestick',
  displayName: 'K 线图',
  description: 'K 线图组件，用于展示金融数据的开盘、收盘、最低、最高价格',
  author: 'yangdongnan',
  defaultStyle: { width: '100%', height: '400px' },
  defaultProps: {
    staticData: [
      { date: '2024-01', open: 20, close: 30, low: 15, high: 35 },
      { date: '2024-02', open: 30, close: 25, low: 20, high: 35 },
      { date: '2024-03', open: 25, close: 35, low: 22, high: 38 },
      { date: '2024-04', open: 35, close: 28, low: 25, high: 40 },
      { date: '2024-05', open: 28, close: 38, low: 26, high: 42 },
    ] as Record<string, unknown>[],
    dateField: 'date',
    openField: 'open',
    closeField: 'close',
    lowField: 'low',
    highField: 'high',
    title: '',
    showLegend: true,
    colorScheme: 'default',
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
      { key: 'dateField', label: '日期字段', type: 'input', placeholder: '如: date' },
      { key: 'openField', label: '开盘字段', type: 'input', placeholder: '如: open' },
      { key: 'closeField', label: '收盘字段', type: 'input', placeholder: '如: close' },
      { key: 'lowField', label: '最低字段', type: 'input', placeholder: '如: low' },
      { key: 'highField', label: '最高字段', type: 'input', placeholder: '如: high' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
