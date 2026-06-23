import type { WidgetConfig } from '../base/types'
export const radioConfig: WidgetConfig = {
  name: 'FgRadio',
  displayName: '单选',
  description: '单选框组，支持静态选项和动态数据源',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '40px',
    fontSize: '14px',
  },
  defaultProps: {
    disabled: false,
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '当前字段值', example: '' },
  ],
  configPanels: ['events', 'rules', 'api', 'variables'],
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue', 'options'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
    ],
  },
}
