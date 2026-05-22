import type { WidgetConfig } from '../base/types'

export const treeLayoutConfig: WidgetConfig = {
  name: 'FgTreeLayout',
  displayName: '树形布局',
  description: '树形布局容器，支持树形结构展示和搜索',
  defaultStyle: { width: '100%', height: '400px' },
  configPanels: ['events', 'api'],
  defaultProps: {
    title: '树形布局',
    showSearch: true,
  },
  propertyPanel: {
    basic: ['label'],
    style: ['width', 'height'],
    props: [
      { key: 'title', label: '标题', type: 'input', default: '树形布局' },
      { key: 'showSearch', label: '显示搜索', type: 'switch', default: true },
    ],
  },
}
