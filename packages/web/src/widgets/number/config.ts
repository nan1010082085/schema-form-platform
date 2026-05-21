import type { WidgetConfig } from '../base/types'
export const numberConfig: WidgetConfig = {
  name: 'FgNumber',
  displayName: '数字输入',
  description: '数字输入框，支持步进、最小最大值限制',
  defaultStyle: {
    width: '240px',
    height: '32px',
    fontSize: '14px',
  },
  defaultProps: {
    placeholder: '请输入数字',
    disabled: false,
    min: undefined as number | undefined,
    max: undefined as number | undefined,
    step: 1,
    precision: undefined as number | undefined,
  },
  configPanels: ['events', 'rules'],
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请输入数字' },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'min', label: '最小值', type: 'number', default: undefined },
      { key: 'max', label: '最大值', type: 'number', default: undefined },
      { key: 'step', label: '步长', type: 'number', default: 1 },
      { key: 'precision', label: '精度', type: 'number', default: undefined },
    ],
  },
}
