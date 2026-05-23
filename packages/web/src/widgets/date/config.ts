import type { WidgetConfig } from '../base/types'
export const dateConfig: WidgetConfig = {
  name: 'FgDate',
  displayName: '日期选择',
  description: '日期选择器，支持日期格式配置',
  defaultStyle: {
    width: '240px',
    height: '44px',
    fontSize: '14px',
  },
  defaultProps: {
    placeholder: '请选择日期',
    clearable: true,
    disabled: false,
    type: 'date' as 'date' | 'datetime' | 'daterange',
    format: 'YYYY-MM-DD',
  },
  configPanels: ['events', 'rules', 'variables'],
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请选择日期' },
      { key: 'clearable', label: '可清空', type: 'switch', default: true },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      {
        key: 'type',
        label: '类型',
        type: 'select',
        options: [
          { label: '日期', value: 'date' },
          { label: '日期时间', value: 'datetime' },
          { label: '日期范围', value: 'daterange' },
        ],
        default: 'date',
      },
      { key: 'format', label: '格式', type: 'input', default: 'YYYY-MM-DD' },
    ],
  },
}
