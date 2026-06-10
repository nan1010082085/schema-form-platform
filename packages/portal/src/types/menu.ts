/**
 * Menu types — 菜单数据结构
 */

/** 后端 /api/menus/route 返回的菜单树节点 */
export interface MenuTreeNode {
  id: string
  name: string
  path: string
  icon: string
  type: 'menu' | 'button'
  permission: string
  sort: number
  status: 'active' | 'inactive'
  component: string
  parentId: string | null
  children: MenuTreeNode[]
}
