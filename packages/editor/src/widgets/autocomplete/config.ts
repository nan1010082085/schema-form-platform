import type { WidgetConfig } from '../base/types'

export const autocompleteConfig: WidgetConfig = {
  name: 'FgAutocomplete',
  displayName: '自动补全',
  description: '自动补全输入框，支持远程搜索和静态建议列表',
  author: 'yangdongnan',
  defaultStyle: { width: '240px', height: '44px' },
  defaultProps: {
    placeholder: '请输入',
    clearable: true,
    disabled: false,
    debounce: 300,
    suggestions: [],
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '当前输入值', example: '' },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请输入' },
      { key: 'clearable', label: '可清空', type: 'switch', default: true },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'debounce', label: '防抖延迟(ms)', type: 'number', default: 300 },
      {
        key: 'suggestions',
        label: '建议列表',
        type: 'options',
        default: [],
        fields: [
          { key: 'value', label: '值', type: 'text' },
        ],
      },
    ],
  },
}
