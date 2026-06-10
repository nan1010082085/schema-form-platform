/**
 * Menu types -- aligned with /api/menus/route contract
 */

/** Menu tree node from /api/menus/route */
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
