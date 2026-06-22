import { MenuModel } from '../models/Menu.js'
import { DEFAULT_TENANT_ID } from './initDefaultTenant.js'

interface MenuSeed {
  _id: string
  parentId: string | null
  name: string
  path: string
  icon: string
  type: 'menu' | 'button'
  permission: string
  sort: number
  microAppId: string | null
  target?: '_self' | '_blank'
  routeType?: 'schema' | 'micro-app' | 'link'
  schemaId?: string | null
  url?: string
}

// Stable UUIDs for each menu item
const IDS = {
  SYSTEM:       'a1b2c3d4-0001-4000-8000-000000000001',
  MENU_MANAGE:  'a1b2c3d4-0002-4000-8000-000000000002',
  EDITOR:       'a1b2c3d4-000b-4000-8000-00000000000b',
  FLOW:         'a1b2c3d4-000c-4000-8000-00000000000c',
} as const

const MENUS: MenuSeed[] = [
  // ── 系统管理 (目录) ──
  { _id: IDS.SYSTEM,       parentId: null,   name: '系统管理',   path: '',            icon: 'Setting',    type: 'menu', permission: '', sort: 1, microAppId: null },

  // ── 系统管理 / 菜单管理 ──
  { _id: IDS.MENU_MANAGE,  parentId: IDS.SYSTEM, name: '菜单管理', path: '/app/admin/menus', icon: 'Menu', type: 'menu', permission: '', sort: 1, microAppId: 'admin', target: '_self' },

  // ── 表单设计器（新开页签） ──
  { _id: IDS.EDITOR,       parentId: null,   name: '表单设计器', path: '/editor',     icon: 'EditPen',    type: 'menu', permission: '', sort: 2, microAppId: 'editor', target: '_blank' },

  // ── 流程管理（新开页签） ──
  { _id: IDS.FLOW,         parentId: null,   name: '流程管理',   path: '/flow/design', icon: 'Connection', type: 'menu', permission: '', sort: 3, microAppId: 'flow',  target: '_blank' },
]

/**
 * 种子数据：默认菜单树
 *
 * 使用 upsert 保证幂等，根据 _id 判断存在性。
 */
export async function seedMenus(): Promise<void> {
  let created = 0
  let updated = 0

  for (const menu of MENUS) {
    const result = await MenuModel.updateOne(
      { _id: menu._id },
      { $set: { ...menu, tenantId: DEFAULT_TENANT_ID } },
      { upsert: true },
    )

    if (result.upsertedCount > 0) created++
    else if (result.modifiedCount > 0) updated++
  }

  const skipped = MENUS.length - created - updated
  console.log(`[seed] Menus: ${created} created, ${updated} updated, ${skipped} unchanged`)
}
