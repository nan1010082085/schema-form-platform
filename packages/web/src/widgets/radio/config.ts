import type { WidgetConfig } from '../base/types'
export const radioConfig: WidgetConfig = {
  name: 'FgRadio',
  displayName: '单选',
  description: '单选框组，支持静态选项和动态数据源',
  defaultStyle: {
    width: '240px',
    height: '44px',
    fontSize: '14px',
  },
  defaultProps: {
    disabled: false,
  },
  configPanels: ['events', 'rules', 'api', 'variables'],
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue', 'options'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
    ],
  },
}
