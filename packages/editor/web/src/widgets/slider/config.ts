import type { WidgetConfig } from '../base/types'

export const sliderConfig: WidgetConfig = {
  name: 'FgSlider',
  displayName: '滑块',
  description: '滑块控件，适用于数值范围选择、评分等场景',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '44px',
  },
  defaultProps: {
    min: 0,
    max: 100,
    step: 1,
    showInput: false,
    showStops: false,
    showTooltip: true,
    disabled: false,
    range: false,
  },
  exposedValues: [
    { key: 'value', type: 'number', description: '当前滑块值', example: 0 },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'min', label: '最小值', type: 'number', default: 0 },
      { key: 'max', label: '最大值', type: 'number', default: 100 },
      { key: 'step', label: '步长', type: 'number', default: 1 },
      { key: 'showInput', label: '显示输入框', type: 'switch', default: false },
      { key: 'showStops', label: '显示间断点', type: 'switch', default: false },
      { key: 'showTooltip', label: '显示提示', type: 'switch', default: true },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'range', label: '范围选择', type: 'switch', default: false },
    ],
  },
}
