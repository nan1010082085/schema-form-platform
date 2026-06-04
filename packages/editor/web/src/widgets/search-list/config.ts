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
      { label: '级联选择', value: 'cascader' },
      { label: '时间选择', value: 'time-picker' },
      { label: '数字输入', value: 'number' },
      { label: '复选框', value: 'checkbox' },
    ],
  },
  { key: 'placeholder', label: '占位文字', type: 'text' },
]

const columnSchema: ArrayFieldSchema[] = [
  { key: 'field', label: '字段名', type: 'text' },
  { key: 'label', label: '列标题', type: 'text' },
  { key: 'width', label: '宽度', type: 'text' },
  { key: 'sortable', label: '可排序', type: 'switch', default: false },
]

const batchActionSchema: ArrayFieldSchema[] = [
  { key: 'label', label: '按钮文本', type: 'text' },
  { key: 'action', label: '动作标识', type: 'text' },
]

export const searchListConfig: WidgetConfig = {
  name: 'FgSearchList',
  displayName: '搜索列表',
  description: '搜索列表复合组件，包含搜索表单、数据表格、分页、行选择、批量操作',
  author: 'yangdongnan',
  defaultStyle: { width: '100%', height: '500px' },
  defaultProps: {
    title: '列表',
    pageSize: 10,
    showPagination: true,
    stripe: true,
    border: true,
    searchFields: [],
    columns: [],
    sortable: false,
    selection: { enabled: false },
    batchActions: [],
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'tableData', type: 'array', description: '列表数据' },
    { key: 'selectedRows', type: 'array', description: '已选行数据' },
    { key: 'selectedCount', type: 'number', description: '已选行数' },
  ],
  eventTargets: [
    { id: 'search', label: '搜索按钮', description: '点击搜索时触发' },
    { id: 'reset', label: '重置按钮', description: '点击重置时触发' },
    { id: 'selection-change', label: '行选择变化', description: '行选择状态变化时触发' },
    { id: 'sort-change', label: '排序变化', description: '点击排序时触发' },
  ],
  configPanels: ['events', 'api', 'variables'] as const,
  receivableEvents: [
    { name: 'refresh', description: '重新加载列表数据' },
    { name: 'reset-search', description: '重置搜索条件并刷新' },
    { name: 'clear-selection', description: '清空行选择' },
  ],
  propertyPanel: {
    basic: ['label'],
    style: [],
    props: [
      { key: 'title', label: '标题', type: 'input', default: '列表' },
      { key: 'searchFields', label: '搜索字段', type: 'array-editor', fields: searchFieldSchema },
      { key: 'columns', label: '列配置', type: 'array-editor', fields: columnSchema },
      { key: 'sortable', label: '列排序', type: 'switch', default: false },
      { key: 'pageSize', label: '每页条数', type: 'number', default: 10 },
      { key: 'showPagination', label: '分页', type: 'switch', default: true },
      { key: 'stripe', label: '斑马纹', type: 'switch', default: true },
      { key: 'border', label: '边框', type: 'switch', default: true },
      { key: 'selection.enabled', label: '行选择', type: 'switch', default: false },
      { key: 'batchActions', label: '批量操作', type: 'array-editor', fields: batchActionSchema },
    ],
  },
}
