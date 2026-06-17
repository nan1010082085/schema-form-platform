import type { WidgetConfig } from '../base/types'

export const filledRadarConfig: WidgetConfig = {
  name: 'FgFilledRadar',
  displayName: '填充雷达图',
  type: 'filled-radar',
  description: '填充雷达图，用于多维度数据对比分析',
  author: 'yangdongnan',
  defaultStyle: { width: '100%', height: '400px' },
  defaultProps: {
    staticData: [
      { category: '销售', value: 90 }, { category: '管理', value: 85 },
      { category: '信息技术', value: 80 }, { category: '客服', value: 70 },
      { category: '研发', value: 95 }, { category: '市场', value: 75 },
    ] as Record<string, unknown>[],
    categoryField: 'category',
    valueField: 'value',
    indicators: [
      { name: '销售', max: 100 }, { name: '管理', max: 100 },
      { name: '信息技术', max: 100 }, { name: '客服', max: 100 },
      { name: '研发', max: 100 }, { name: '市场', max: 100 },
    ] as Record<string, unknown>[],
    title: '',
    showLegend: true,
    legendPosition: 'bottom',
    showTooltip: true,
    showLabel: false,
    colorScheme: 'default',
    customColors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'] as string[],
    fillOpacity: 0.6,
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
      { key: 'categoryField', label: '分类字段', type: 'text', placeholder: '如: category' },
      { key: 'valueField', label: '值字段', type: 'text', placeholder: '如: value' },
      { key: 'indicators', label: '指标配置 (JSON)', type: 'json' },
      { key: 'title', label: '图表标题', type: 'text' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
      { key: 'showTooltip', label: '显示提示', type: 'switch', default: true },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: false },
      { key: 'fillOpacity', label: '填充透明度', type: 'number', default: 0.6 },
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
