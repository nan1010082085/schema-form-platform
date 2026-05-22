import type { WidgetConfig, ArrayFieldSchema } from '../base/types'

const searchFieldSchema: ArrayFieldSchema[] = [
  { key: 'field', label: '字段名', type: 'text' },
  { key: 'label', label: '标签', type: 'text' },
  {
    key: 'type',
    label: '类型',
    type: 'select',
    options: [
      { label: '文本输入', value: 'input' },
      { label: '下拉选择', value: 'select' },
      { label: '日期', value: 'date' },
      { label: '日期范围', value: 'date-range' },
    ],
  },
  { key: 'placeholder', label: '占位文字', type: 'text' },
]

const columnSchema: ArrayFieldSchema[] = [
  { key: 'field', label: '字段名', type: 'text' },
  { key: 'label', label: '列标题', type: 'text' },
  { key: 'width', label: '宽度', type: 'text' },
]

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
    searchFields: [],
    columns: [],
  },
  configPanels: ['events', 'api'] as const,
  propertyPanel: {
    basic: ['label'],
    style: [],
    props: [
      { key: 'title', label: '标题', type: 'input', default: '列表' },
      { key: 'searchFields', label: '搜索字段', type: 'array-editor', fields: searchFieldSchema },
      { key: 'columns', label: '列配置', type: 'array-editor', fields: columnSchema },
      { key: 'pageSize', label: '每页条数', type: 'number', default: 10 },
      { key: 'showPagination', label: '分页', type: 'switch', default: true },
      { key: 'stripe', label: '斑马纹', type: 'switch', default: true },
      { key: 'border', label: '边框', type: 'switch', default: true },
    ],
  },
}
