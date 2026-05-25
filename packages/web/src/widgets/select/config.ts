import type { WidgetConfig } from '../base/types'
export const selectConfig: WidgetConfig = {
  name: 'FgSelect',
  displayName: '下拉选择',
  description: '下拉选择器，支持静态选项和动态数据源加载',
  defaultStyle: {
    width: '240px',
    height: '44px',
    fontSize: '14px',
  },
  defaultProps: {
    placeholder: '请选择',
    clearable: true,
    disabled: false,
    multiple: false,
    filterable: false,
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '当前字段值', example: '' },
  ],
  configPanels: ['events', 'rules', 'api', 'variables'],
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue', 'options'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请选择' },
      { key: 'clearable', label: '可清空', type: 'switch', default: true },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'multiple', label: '多选', type: 'switch', default: false },
      { key: 'filterable', label: '可搜索', type: 'switch', default: false },
    ],
  },
}
