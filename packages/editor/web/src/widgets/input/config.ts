import type { WidgetConfig } from '../base/types'

export const inputConfig: WidgetConfig = {
  name: 'FgInput',
  displayName: '输入框',
  description: '单行文本输入框，支持 placeholder、清空、禁用等配置',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '44px',
    fontSize: '14px',
  },
  defaultProps: {
    placeholder: '请输入',
    clearable: true,
    disabled: false,
    readonly: false,
    maxlength: undefined as number | undefined,
    showPassword: false,
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '当前字段值', example: '' },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请输入' },
      { key: 'clearable', label: '可清空', type: 'switch', default: true },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'readonly', label: '只读', type: 'switch', default: false },
      { key: 'maxlength', label: '最大长度', type: 'number', default: undefined },
      { key: 'showPassword', label: '密码输入', type: 'switch', default: false },
    ],
  },
}
