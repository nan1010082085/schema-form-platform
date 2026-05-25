import type { WidgetConfig } from '../base/types'
export const textareaConfig: WidgetConfig = {
  name: 'FgTextarea',
  displayName: '文本域',
  description: '多行文本输入框，支持行数配置',
  defaultStyle: {
    width: '240px',
    height: '80px',
    fontSize: '14px',
  },
  defaultProps: {
    placeholder: '请输入',
    disabled: false,
    readonly: false,
    rows: 3,
    maxlength: undefined as number | undefined,
    showWordLimit: false,
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '当前字段值', example: '' },
  ],
  configPanels: ['events', 'rules', 'variables'],
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请输入' },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'readonly', label: '只读', type: 'switch', default: false },
      { key: 'rows', label: '行数', type: 'number', default: 3 },
      { key: 'maxlength', label: '最大长度', type: 'number', default: undefined },
      { key: 'showWordLimit', label: '字数统计', type: 'switch', default: false },
    ],
  },
}
