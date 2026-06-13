import type { WidgetConfig } from '../base/types'

export const doubleColConfig: WidgetConfig = {
  name: 'FgDoubleCol',
  displayName: '双列容器',
  description: '双列布局容器，每列可放置 1 个组件',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '60px',
  },
  configPanels: ['events', 'variables'],
  defaultProps: {
    gutter: 16,
    colWidths: [50, 50],
  },
  propertyPanel: {
    basic: [
      { key: 'gutter', label: '列间距', type: 'number', default: 16 },
      {
        key: 'colWidths',
        label: '列宽(%)',
        type: 'array',
        fields: [
          { key: 'width', label: '宽度(%)', type: 'number', default: 50 },
        ],
      },
    ],
    style: ['margin', 'padding'],
    props: [],
  },
}
