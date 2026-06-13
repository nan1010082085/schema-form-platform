import type { WidgetConfig } from '../base/types'

export const timePickerConfig: WidgetConfig = {
  name: 'FgTimePicker',
  displayName: '时间选择',
  description: '时间选择器，支持固定时间和范围选择',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '44px',
  },
  defaultProps: {
    placeholder: '请选择时间',
    clearable: true,
    disabled: false,
    readonly: false,
    isRange: false,
    format: 'HH:mm:ss',
    arrowControl: false,
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '当前时间值', example: '' },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请选择时间' },
      { key: 'clearable', label: '可清空', type: 'switch', default: true },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'readonly', label: '只读', type: 'switch', default: false },
      { key: 'isRange', label: '范围选择', type: 'switch', default: false },
      { key: 'format', label: '时间格式', type: 'input', default: 'HH:mm:ss' },
      { key: 'arrowControl', label: '箭头控制', type: 'switch', default: false },
    ],
  },
}
