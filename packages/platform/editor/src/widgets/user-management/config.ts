import type { WidgetConfig } from '../base/types'

export const userManagementConfig: WidgetConfig = {
  name: 'FgUserManagement',
  displayName: '用户管理',
  description: '用户管理表格，支持搜索、分页、新增/编辑/删除用户、重置密码',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '600px',
  },
  defaultProps: {
    tableColumns: ['username', 'displayName', 'deptId', 'phone', 'status', 'createdAt'],
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
    { name: 'refresh', description: '刷新用户列表' },
  ],
  propertyPanel: {
    basic: ['label'],
    style: [],
    props: [
      {
        key: 'tableColumns',
        label: '显示列',
        type: 'json',
        desc: '数组格式，可选值: username / displayName / deptId / phone / status / createdAt',
        default: ['username', 'displayName', 'deptId', 'phone', 'status', 'createdAt'],
      },
      { key: 'pageSize', label: '每页条数', type: 'number', default: 20 },
      { key: 'searchable', label: '显示搜索', type: 'switch', default: true },
    ],
  },
}
