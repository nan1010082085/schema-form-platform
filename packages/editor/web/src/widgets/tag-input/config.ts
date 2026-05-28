import type { WidgetConfig } from '../base/types'

export const tagInputConfig: WidgetConfig = {
  name: 'FgTagInput',
  displayName: '标签输入',
  description: '标签输入框，支持动态添加和删除标签',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '44px',
  },
  defaultProps: {
    placeholder: '请输入标签',
    disabled: false,
    maxlength: 20,
    maxTags: 10,
    closable: true,
  },
  exposedValues: [
    { key: 'value', type: 'array', description: '当前标签数组', example: [] },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请输入标签' },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'maxlength', label: '标签最大长度', type: 'number', default: 20 },
      { key: 'maxTags', label: '最大标签数', type: 'number', default: 10 },
      { key: 'closable', label: '可关闭', type: 'switch', default: true },
    ],
  },
}
