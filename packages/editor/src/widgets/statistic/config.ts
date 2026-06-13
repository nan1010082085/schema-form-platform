import type { WidgetConfig } from '../base/types'

export const statisticConfig: WidgetConfig = {
  name: 'FgStatistic',
  displayName: '统计卡片',
  description: 'KPI 统计卡片，展示数值与趋势',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '120px',
  },
  defaultProps: {
    title: '总用户数',
    value: 12345,
    prefix: '',
    suffix: '',
    precision: 0,
    trend: 'up' as 'up' | 'down' | 'flat',
    trendValue: '',
    icon: '',
    color: '#409EFF',
    valueFontSize: '28px',
    titleFontSize: '14px',
  },
  configPanels: ['api', 'variables'],
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'currentValue', type: 'number', description: '当前显示的数值' },
  ],
  receivableEvents: [
    { name: 'refresh', description: '重新加载数据' },
    { name: 'set-value', description: '设置数值', params: { value: '数值' } },
  ],
  propertyPanel: {
    basic: ['label'],
    style: ['margin', 'padding', 'backgroundColor', 'borderRadius'],
    props: [
      { key: 'title', label: '标题', type: 'input', default: '总用户数' },
      { key: 'value', label: '数值', type: 'number', default: 12345 },
      { key: 'prefix', label: '前缀', type: 'input', placeholder: '如: ¥', default: '' },
      { key: 'suffix', label: '后缀', type: 'input', placeholder: '如: 万', default: '' },
      { key: 'precision', label: '小数位数', type: 'number', default: 0 },
      {
        key: 'trend',
        label: '趋势方向',
        type: 'select',
        options: [
          { label: '上升', value: 'up' },
          { label: '下降', value: 'down' },
          { label: '持平', value: 'flat' },
        ],
        default: 'up',
      },
      { key: 'trendValue', label: '对比标签', type: 'input', placeholder: '如: +12.5%', default: '' },
      { key: 'icon', label: '图标', type: 'input', placeholder: 'Element Plus 图标名', default: '' },
      { key: 'color', label: '数值颜色', type: 'color', default: '#409EFF' },
      { key: 'valueFontSize', label: '数值字号', type: 'input', default: '28px' },
      { key: 'titleFontSize', label: '标题字号', type: 'input', default: '14px' },
    ],
  },
}
