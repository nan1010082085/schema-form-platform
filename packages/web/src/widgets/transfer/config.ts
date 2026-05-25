import type { WidgetConfig } from '../base/types'

export const transferConfig: WidgetConfig = {
  name: 'FgTransfer',
  displayName: '穿梭框',
  description: '穿梭框组件，支持左右列表数据穿梭',
  author: 'yangdongnan',
  defaultStyle: { width: '700px', height: '300px' },
  defaultProps: {
    leftTitle: '待选',
    rightTitle: '已选',
    filterable: true,
  },
  exposedValues: [
    { key: 'value', type: 'array', description: '已选值' },
  ],
  configPanels: ['events', 'rules', 'variables'] as const,
  propertyPanel: {
    basic: ['field', 'label'],
    style: [],
    props: [
      { key: 'leftTitle', label: '左侧标题', type: 'text', default: '待选' },
      { key: 'rightTitle', label: '右侧标题', type: 'text', default: '已选' },
      { key: 'filterable', label: '可搜索', type: 'switch', default: true },
    ],
  },
}
