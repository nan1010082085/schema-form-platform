import type { WidgetConfig } from '../base/types'

export const treeSelectConfig: WidgetConfig = {
  name: 'FgTreeSelect',
  displayName: '树形选择',
  description: '树形选择器，支持层级数据选择（如菜单、部门）',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '40px',
    fontSize: '14px',
  },
  defaultProps: {
    placeholder: '请选择',
    clearable: true,
    disabled: false,
    multiple: false,
    checkStrictly: true,
    showCheckbox: false,
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '选中值', example: '' },
    { key: 'label', type: 'string', description: '选中标签', example: '' },
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
      { key: 'checkStrictly', label: '父子不关联', type: 'switch', default: true },
      { key: 'showCheckbox', label: '显示复选框', type: 'switch', default: false },
    ],
  },
}
