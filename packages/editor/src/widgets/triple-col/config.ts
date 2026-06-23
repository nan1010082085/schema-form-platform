import type { WidgetConfig } from '../base/types'

export const tripleColConfig: WidgetConfig = {
  name: 'FgTripleCol',
  displayName: '三列容器',
  description: '三列布局容器，每列可放置 1 个组件',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '60px',
  },
  configPanels: ['events', 'variables'],
  defaultProps: {
    gutter: 16,
    colWidths: [33, 34, 33],
  },
  propertyPanel: {
    basic: [
      { key: 'gutter', label: '列间距', type: 'number', default: 16 },
      {
        key: 'colWidths',
        label: '列宽(%)',
        type: 'number-array',
      },
    ],
    style: ['margin', 'padding'],
    props: [],
  },
}
