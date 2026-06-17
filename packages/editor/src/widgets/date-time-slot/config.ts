import type { WidgetConfig } from '../base/types'

export const dateTimeSlotConfig: WidgetConfig = {
  name: 'FgDateTimeSlot',
  displayName: '日期时间区间',
  description: '日期时间区间选择器，支持开始/结束时间配置',
  author: 'yangdongnan',
  defaultStyle: { width: '400px', height: '40px' },
  defaultProps: {
    startPlaceholder: '开始时间',
    endPlaceholder: '结束时间',
    format: 'YYYY-MM-DD HH:mm:ss',
    rangeSeparator: '至',
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '当前字段值', example: '' },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label'],
    style: [],
    props: [
      { key: 'startPlaceholder', label: '开始占位', type: 'input', default: '开始时间' },
      { key: 'endPlaceholder', label: '结束占位', type: 'input', default: '结束时间' },
      { key: 'format', label: '格式', type: 'input', default: 'YYYY-MM-DD HH:mm:ss' },
      { key: 'rangeSeparator', label: '分隔符', type: 'input', default: '至' },
    ],
  },
}
