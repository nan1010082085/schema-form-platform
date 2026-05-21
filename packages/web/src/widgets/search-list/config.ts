import type { WidgetConfig } from '../base/types'

export const searchListConfig: WidgetConfig = {
  name: 'FgSearchList',
  displayName: '搜索列表',
  description: '搜索列表复合组件，包含搜索表单、数据表格、分页',
  defaultStyle: { width: '100%', height: '500px' },
  defaultProps: {
    title: '列表',
    pageSize: 10,
    showPagination: true,
    stripe: true,
    border: true,
  },
  configPanels: ['api'] as const,
  propertyPanel: {
    basic: ['label'],
    style: ['width', 'height'],
    props: [
      { key: 'title', label: '标题', type: 'input', default: '列表' },
      { key: 'pageSize', label: '每页条数', type: 'number', default: 10 },
      { key: 'showPagination', label: '分页', type: 'switch', default: true },
      { key: 'stripe', label: '斑马纹', type: 'switch', default: true },
      { key: 'border', label: '边框', type: 'switch', default: true },
      { key: 'columns', label: '列配置', type: 'columns' },
    ],
  },
}
