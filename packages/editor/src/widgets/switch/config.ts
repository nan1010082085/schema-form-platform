import type { WidgetConfig } from '../base/types'

export const switchConfig: WidgetConfig = {
  name: 'FgSwitch',
  displayName: '开关',
  description: '开关控件，用于布尔值切换',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '40px',
  },
  defaultProps: {
    disabled: false,
    activeText: '',
    inactiveText: '',
    activeColor: '',
    inactiveColor: '',
    activeValue: true,
    inactiveValue: false,
  },
  exposedValues: [
    { key: 'value', type: 'boolean', description: '当前开关状态', example: false },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'activeText', label: '开启文字', type: 'input', default: '' },
      { key: 'inactiveText', label: '关闭文字', type: 'input', default: '' },
      { key: 'activeColor', label: '开启颜色', type: 'color', default: '' },
      { key: 'inactiveColor', label: '关闭颜色', type: 'color', default: '' },
    ],
  },
}
