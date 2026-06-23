import type { WidgetConfig } from '../base/types'

export const colorPickerConfig: WidgetConfig = {
  name: 'FgColorPicker',
  displayName: '颜色选择',
  description: '颜色选择器，用于主题配置、可视化编辑等场景',
  author: 'yangdongnan',
  defaultStyle: {
    width: '240px',
    height: '40px',
  },
  defaultProps: {
    disabled: false,
    showAlpha: false,
    colorFormat: '',
    predefine: [],
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '当前颜色值', example: '#409eff' },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
      { key: 'showAlpha', label: '透明度', type: 'switch', default: false },
      {
        key: 'colorFormat',
        label: '颜色格式',
        type: 'select',
        default: '',
        options: [
          { label: '默认', value: '' },
          { label: 'hex', value: 'hex' },
          { label: 'rgb', value: 'rgb' },
          { label: 'hsl', value: 'hsl' },
          { label: 'hsv', value: 'hsv' },
        ],
      },
    ],
  },
}
