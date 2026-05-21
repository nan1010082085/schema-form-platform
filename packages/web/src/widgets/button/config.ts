import type { WidgetConfig } from '../base/types'
export const buttonConfig: WidgetConfig = {
  name: 'FgButton',
  displayName: '按钮',
  defaultStyle: {
    width: '100px',
    height: '44px',
  },
  defaultProps: {
    type: 'primary',
    size: 'default',
    plain: false,
    round: false,
    circle: false,
    disabled: false,
    text: '按钮',
  },
  configPanels: ['events'],
  propertyPanel: {
    basic: [
      'label',
      {
        key: 'type',
        label: '按钮类型',
        type: 'select',
        options: [
          { label: '默认', value: '' },
          { label: '主要', value: 'primary' },
          { label: '成功', value: 'success' },
          { label: '警告', value: 'warning' },
          { label: '危险', value: 'danger' },
          { label: '信息', value: 'info' },
        ],
        default: 'primary',
      },
      {
        key: 'size',
        label: '尺寸',
        type: 'select',
        options: [
          { label: '大', value: 'large' },
          { label: '中', value: 'default' },
          { label: '小', value: 'small' },
        ],
        default: 'default',
      },
      { key: 'plain', label: '朴素按钮', type: 'switch', default: false },
      { key: 'round', label: '圆角按钮', type: 'switch', default: false },
      { key: 'circle', label: '圆形按钮', type: 'switch', default: false },
      { key: 'disabled', label: '禁用', type: 'switch', default: false },
    ],
    style: ['backgroundColor', 'border', 'borderRadius', 'fontSize', 'color'],
    props: [],
  },
}
