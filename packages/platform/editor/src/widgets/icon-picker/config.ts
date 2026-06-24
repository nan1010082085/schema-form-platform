import type { WidgetConfig } from '../base/types'

export const iconPickerConfig: WidgetConfig = {
  name: 'FgIconPicker',
  displayName: '图标选择',
  description: '图标选择器，从 Element Plus Icons 中选择图标',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '40px',
    fontSize: '14px',
  },
  defaultProps: {
    placeholder: '请选择图标',
    clearable: true,
    disabled: false,
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '图标名称', example: 'Edit' },
  ],
  configPanels: ['events', 'rules', 'variables'],
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请选择图标' },
      { key: 'clearable', label: '可清空', type: 'switch', default: true },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
    ],
  },
}
