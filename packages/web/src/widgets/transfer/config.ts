import type { WidgetConfig } from '../base/types'

export const transferConfig: WidgetConfig = {
  name: 'FgTransfer',
  displayName: '穿梭框',
  description: '穿梭框组件，支持左右列表数据穿梭',
  defaultStyle: { width: '700px', height: '300px' },
  defaultProps: {
    titles: ['待选', '已选'],
    filterable: true,
  },
  configPanels: ['events', 'rules'] as const,
  propertyPanel: {
    basic: ['field', 'label'],
    style: ['width', 'height'],
    props: [
      { key: 'titles', label: '标题', type: 'array-editor', fields: [
        { key: '0', label: '左侧标题', type: 'text', default: '待选' },
        { key: '1', label: '右侧标题', type: 'text', default: '已选' },
      ]},
      { key: 'filterable', label: '可搜索', type: 'switch', default: true },
    ],
  },
}
