import type { WidgetConfig } from '../base/types'

export const richtextConfig: WidgetConfig = {
  name: 'FgRichtext',
  displayName: '富文本',
  description: '富文本编辑器，支持格式化内容输入',
  defaultStyle: {
    width: '100%',
    height: '200px',
  },
  defaultProps: {
    placeholder: '请输入内容',
    readonly: false,
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '当前字段值', example: '' },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: [],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请输入内容' },
      { key: 'readonly', label: '只读', type: 'switch', default: false },
    ],
  },
}
