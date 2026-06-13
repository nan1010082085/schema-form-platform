import type { WidgetConfig } from '../base/types'

export const cascaderConfig: WidgetConfig = {
  name: 'FgCascader',
  displayName: '级联选择',
  description: '级联选择器，适用于省市区、多级分类等场景',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '44px',
  },
  defaultProps: {
    placeholder: '请选择',
    clearable: true,
    disabled: false,
    showAllLevels: true,
    collapseTags: false,
    multiple: false,
    checkStrictly: false,
  },
  exposedValues: [
    { key: 'value', type: 'array', description: '当前选中值（数组）', example: [] },
  ],
  configPanels: ['events', 'rules', 'api', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请选择' },
      { key: 'clearable', label: '可清空', type: 'switch', default: true },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'showAllLevels', label: '显示完整路径', type: 'switch', default: true },
      { key: 'collapseTags', label: '折叠标签', type: 'switch', default: false },
      { key: 'multiple', label: '多选', type: 'switch', default: false },
      { key: 'checkStrictly', label: '任意级别可选', type: 'switch', default: false },
      { key: 'options', label: '选项数据', type: 'options', default: [] },
    ],
  },
}
