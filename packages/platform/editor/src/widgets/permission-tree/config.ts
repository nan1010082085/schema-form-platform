import type { WidgetConfig } from '../base/types'

export const permissionTreeConfig: WidgetConfig = {
  name: 'FgPermissionTree',
  displayName: '权限树',
  description: '权限树选择器，展示菜单和按钮权限，支持勾选',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '400px',
  },
  defaultProps: {
    data: [],
    showCheckbox: true,
    checkStrictly: false,
    defaultExpandAll: true,
    nodeKey: 'id',
    props: { children: 'children', label: 'label' },
  },
  exposedValues: [
    { key: 'checkedKeys', type: 'array', description: '勾选的节点key', example: [] },
  ],
  configPanels: ['events', 'variables'],
  propertyPanel: {
    basic: ['field', 'label'],
    style: ['fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'showCheckbox', label: '显示复选框', type: 'switch', default: true },
      { key: 'checkStrictly', label: '父子不关联', type: 'switch', default: false },
      { key: 'defaultExpandAll', label: '默认展开全部', type: 'switch', default: true },
    ],
  },
}
