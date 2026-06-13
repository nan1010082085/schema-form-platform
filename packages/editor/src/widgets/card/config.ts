import type { WidgetConfig } from '../base/types'
export const cardConfig: WidgetConfig = {
  name: 'FgCard',
  displayName: '卡片容器',
  description: '卡片容器，提供标题和阴影包裹，用于内容分组展示',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
  },
  configPanels: ['events', 'variables'],
  defaultProps: {
    title: '卡片标题',
    shadow: 'hover' as const,
    showHeader: true,
  },
  propertyPanel: {
    basic: [
      { key: 'title', label: '标题', type: 'input', default: '卡片标题' },
      {
        key: 'shadow',
        label: '阴影',
        type: 'select',
        options: [
          { label: '总是显示', value: 'always' },
          { label: '悬停显示', value: 'hover' },
          { label: '不显示', value: 'never' },
        ],
        default: 'hover',
      },
      { key: 'showHeader', label: '显示标题栏', type: 'switch', default: true },
    ],
    style: ['margin', 'padding', 'backgroundColor', 'borderRadius'],
    props: [],
  },
}
