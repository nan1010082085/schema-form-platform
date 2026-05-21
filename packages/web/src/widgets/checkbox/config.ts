import type { WidgetConfig } from '../base/types'
export const checkboxConfig: WidgetConfig = {
  name: 'FgCheckbox',
  displayName: '多选',
  defaultStyle: {
    width: '240px',
    height: '32px',
    fontSize: '14px',
  },
  defaultProps: {
    disabled: false,
  },
  configPanels: ['events', 'rules', 'api'],
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue', 'options'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
    ],
  },
}
