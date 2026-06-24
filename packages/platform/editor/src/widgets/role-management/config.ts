import type { WidgetConfig } from '../base/types'

export const roleManagementConfig: WidgetConfig = {
  name: 'FgRoleManagement',
  displayName: '角色管理',
  description: '角色管理表格，支持搜索、分页、新增/编辑/删除角色、分配菜单权限',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '600px',
  },
  defaultProps: {
    tableColumns: ['name', 'permissions', 'data_scope', 'createdAt'],
    pageSize: 20,
    searchable: true,
  },
  configPanels: ['events', 'variables'],
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'tableData', type: 'array', description: '表格数据' },
    { key: 'total', type: 'number', description: '总条数' },
    { key: 'selectedRows', type: 'array', description: '选中行' },
  ],
  receivableEvents: [
    { name: 'refresh', description: '刷新角色列表' },
  ],
  propertyPanel: {
    basic: ['label'],
    style: [],
    props: [
      {
        key: 'tableColumns',
        label: '显示列',
        type: 'json',
        desc: '数组格式，可选值: name / permissions / data_scope / createdAt',
        default: ['name', 'permissions', 'data_scope', 'createdAt'],
      },
      { key: 'pageSize', label: '每页条数', type: 'number', default: 20 },
      { key: 'searchable', label: '显示搜索', type: 'switch', default: true },
    ],
  },
}
