import type { WidgetConfig } from '../base/types'
export const selectConfig: WidgetConfig = {
  name: 'FgSelect',
  displayName: '下拉选择',
  defaultStyle: {
    width: '240px',
    height: '32px',
    fontSize: '14px',
  },
  defaultProps: {
    placeholder: '请选择',
    clearable: true,
    disabled: false,
    multiple: false,
    filterable: false,
  },
  configPanels: ['events', 'rules', 'api'],
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
