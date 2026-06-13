import type { WidgetConfig } from '../base/types'

export interface TableColumn {
  prop: string
  label: string
  width?: number
  fixed?: 'left' | 'right'
  sortable?: boolean | 'custom'
  filterable?: boolean
  filters?: Array<{ text: string; value: unknown }>
  filterMethod?: (value: unknown, row: Record<string, unknown>) => boolean
}

export interface PaginationConfig {
  enabled: boolean
  pageSize: number
  pageSizes: number[]
}

export interface SelectionConfig {
  enabled: boolean
}

export const tableConfig: WidgetConfig = {
  name: 'FgTable',
  displayName: '表格',
  description: '数据表格组件，支持列配置、分页、排序、筛选、行选择',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '300px',
  },
  defaultProps: {
    columns: [
      { prop: 'name', label: '姓名', width: 120 },
      { prop: 'age', label: '年龄', width: 80 },
    ] as TableColumn[],
    stripe: true,
    border: true,
    height: 280,
    sortable: false,
    filterable: false,
    pagination: {
      enabled: true,
      pageSize: 20,
      pageSizes: [10, 20, 50, 100],
    } as PaginationConfig,
    selection: {
      enabled: false,
    } as SelectionConfig,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'tableData', type: 'array', description: '表格数据' },
    { key: 'selectedRows', type: 'array', description: '当前选中的行数据' },
  ],
  configPanels: ['api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载表格数据' },
    { name: 'set-data', description: '设置表格数据', params: { data: '数据数组' } },
    { name: 'set-search-params', description: '设置搜索参数', params: { params: '参数对象' } },
  ],
  propertyPanel: {
    basic: ['label'],
    style: [],
    props: [
      { key: 'columns', label: '列配置', type: 'columns' },
      { key: 'stripe', label: '斑马纹', type: 'switch' },
      { key: 'border', label: '边框', type: 'switch' },
      { key: 'height', label: '表格高度', type: 'number' },
      { key: 'sortable', label: '全局排序', type: 'switch' },
      { key: 'filterable', label: '全局筛选', type: 'switch' },
      { key: 'selection.enabled', label: '行选择', type: 'switch' },
      { key: 'pagination.enabled', label: '分页', type: 'switch' },
      { key: 'pagination.pageSize', label: '每页条数', type: 'number' },
    ],
  },
}
