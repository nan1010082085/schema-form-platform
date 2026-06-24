import type { WidgetConfig } from '../base/types'

export const userSelectorConfig: WidgetConfig = {
  name: 'FgUserSelector',
  displayName: '用户选择',
  description: '用户选择器，支持搜索和多选用户',
  author: 'yangdongnan',
  defaultStyle: { width: '240px', height: '40px', fontSize: '14px' },
  defaultProps: {
    placeholder: '请选择用户',
    clearable: true,
    disabled: false,
    multiple: false,
    filterable: true,
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '选中用户ID', example: '' },
    { key: 'label', type: 'string', description: '选中用户名', example: '' },
  ],
  configPanels: ['events', 'rules', 'variables'],
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请选择用户' },
      { key: 'clearable', label: '可清空', type: 'switch', default: true },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'multiple', label: '多选', type: 'switch', default: false },
    ],
  },
}
