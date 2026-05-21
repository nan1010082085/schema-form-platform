import type { WidgetConfig } from '../base/types'
export const spacerConfig: WidgetConfig = {
  name: 'FgSpacer',
  displayName: '间距',
  description: '间隔组件，用于控制元素间距',
  defaultStyle: {
    width: '100%',
    height: '20px',
  },
  defaultProps: {
    height: 20,
  },
  propertyPanel: {
    basic: ['field', 'label'],
    style: ['margin', 'padding', 'backgroundColor'],
    props: [
      { key: 'height', label: '高度', type: 'number', default: 20 },
    ],
  },
}
