import type { WidgetConfig } from '../base/types'
export const checkboxConfig: WidgetConfig = {
  name: 'FgCheckbox',
  displayName: '多选',
  description: '多选框组，支持静态选项和动态数据源',
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
