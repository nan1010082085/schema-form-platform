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
  app?: string
}

// Stable UUIDs for each menu item
const IDS = {
  SYSTEM:       'a1b2c3d4-0001-4000-8000-000000000001',
  MENU_MANAGE:  'a1b2c3d4-0002-4000-8000-000000000002',
  USER_MANAGE:  'a1b2c3d4-0003-4000-8000-000000000003',
  ROLE_MANAGE:  'a1b2c3d4-0004-4000-8000-000000000004',
  DEPT_MANAGE:  'a1b2c3d4-0005-4000-8000-000000000005',
  POST_MANAGE:  'a1b2c3d4-0006-4000-8000-000000000006',
  DICT_MANAGE:  'a1b2c3d4-0007-4000-8000-000000000007',
  CONFIG_MANAGE:'a1b2c3d4-0008-4000-8000-000000000008',
  AUDIT_LOG:    'a1b2c3d4-0009-4000-8000-000000000009',
  LOGIN_LOG:    'a1b2c3d4-000a-4000-8000-00000000000a',
  ONLINE_USER:  'a1b2c3d4-000b-4000-8000-00000000000b',
  TENANT_MANAGE:'a1b2c3d4-000c-4000-8000-00000000000c',
  EDITOR:       'a1b2c3d4-000d-4000-8000-00000000000d',
  FLOW:         'a1b2c3d4-000e-4000-8000-00000000000e',
} as const

const MENUS: MenuSeed[] = [
  // ── 系统管理 (目录) — app=admin ──
  { _id: IDS.SYSTEM,       parentId: null,         name: '系统管理',   path: '',            icon: 'Setting',    type: 'menu', permission: '',           sort: 1, microAppId: null, app: 'admin' },

  // ── 系统管理子菜单 — app=admin ──
  { _id: IDS.MENU_MANAGE,  parentId: IDS.SYSTEM,   name: '菜单管理',   path: '/system/menus',       icon: 'Menu',         type: 'menu', permission: 'menu:view',     sort: 1, microAppId: 'admin', target: '_self', app: 'admin' },
  { _id: IDS.USER_MANAGE,  parentId: IDS.SYSTEM,   name: '用户管理',   path: '/system/users',       icon: 'User',         type: 'menu', permission: 'user:view',     sort: 2, microAppId: 'admin', target: '_self', app: 'admin' },
  { _id: IDS.ROLE_MANAGE,  parentId: IDS.SYSTEM,   name: '角色管理',   path: '/system/roles',       icon: 'Lock',         type: 'menu', permission: 'role:view',     sort: 3, microAppId: 'admin', target: '_self', app: 'admin' },
  { _id: IDS.DEPT_MANAGE,  parentId: IDS.SYSTEM,   name: '部门管理',   path: '/system/depts',       icon: 'OfficeBuilding', type: 'menu', permission: 'dept:view',   sort: 4, microAppId: 'admin', target: '_self', app: 'admin' },
  { _id: IDS.POST_MANAGE,  parentId: IDS.SYSTEM,   name: '岗位管理',   path: '/system/posts',       icon: 'Postcard',     type: 'menu', permission: 'post:view',     sort: 5, microAppId: 'admin', target: '_self', app: 'admin' },
  { _id: IDS.DICT_MANAGE,  parentId: IDS.SYSTEM,   name: '字典管理',   path: '/system/dicts',       icon: 'Collection',   type: 'menu', permission: 'dict:view',     sort: 6, microAppId: 'admin', target: '_self', app: 'admin' },
  { _id: IDS.CONFIG_MANAGE,parentId: IDS.SYSTEM,   name: '参数设置',   path: '/system/configs',     icon: 'Tickets',      type: 'menu', permission: 'config:view',   sort: 7, microAppId: 'admin', target: '_self', app: 'admin' },
  { _id: IDS.AUDIT_LOG,    parentId: IDS.SYSTEM,   name: '操作日志',   path: '/system/audit-logs',  icon: 'Document',     type: 'menu', permission: 'audit:view',    sort: 8, microAppId: 'admin', target: '_self', app: 'admin' },
  { _id: IDS.LOGIN_LOG,    parentId: IDS.SYSTEM,   name: '登录日志',   path: '/system/login-logs',  icon: 'List',         type: 'menu', permission: 'loginlog:view', sort: 9, microAppId: 'admin', target: '_self', app: 'admin' },
  { _id: IDS.ONLINE_USER,  parentId: IDS.SYSTEM,   name: '在线用户',   path: '/system/online-users',icon: 'Monitor',      type: 'menu', permission: 'onlineuser:view', sort: 10, microAppId: 'admin', target: '_self', app: 'admin' },
  { _id: IDS.TENANT_MANAGE,parentId: IDS.SYSTEM,   name: '租户管理',   path: '/system/tenants',     icon: 'Management',   type: 'menu', permission: 'tenant:view',   sort: 11, microAppId: 'admin', target: '_self', app: 'admin' },

  // ── 表单设计器（新开页签） — app=shell ──
  { _id: IDS.EDITOR,       parentId: null,         name: '表单设计器', path: '/editor',     icon: 'EditPen',    type: 'menu', permission: '', sort: 2, microAppId: 'editor', target: '_blank', app: 'shell' },

  // ── 流程管理（新开页签） — app=shell ──
  { _id: IDS.FLOW,         parentId: null,         name: '流程管理',   path: '/flow/design', icon: 'Connection', type: 'menu', permission: '', sort: 3, microAppId: 'flow',  target: '_blank', app: 'shell' },
]

/**
 * 种子数据：默认菜单树
 *
 * 使用 upsert 保证幂等，根据 _id 判断存在性。
 * 同时为现有菜单补充 app 字段（向后兼容迁移）。
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

  // ── 迁移：为现有菜单补充 app 字段 ──
  const systemDir = await MenuModel.findOne({ _id: IDS.SYSTEM })
  if (systemDir) {
    // 系统管理目录下的子菜单 → app=admin
    const adminChildren = await MenuModel.updateMany(
      { parentId: systemDir._id, app: { $in: [null, ''] } },
      { $set: { app: 'admin' } },
    )
    // microAppId=admin 的菜单 → app=admin
    const adminMicroApp = await MenuModel.updateMany(
      { microAppId: 'admin', app: { $in: [null, ''] } },
      { $set: { app: 'admin' } },
    )
    // microAppId=editor/flow 的菜单 → app=shell
    const shellMicroApp = await MenuModel.updateMany(
      { microAppId: { $in: ['editor', 'flow'] }, app: { $in: [null, ''] } },
      { $set: { app: 'shell' } },
    )

    const migrated = adminChildren.modifiedCount + adminMicroApp.modifiedCount + shellMicroApp.modifiedCount
    if (migrated > 0) {
      console.log(`[seed] Migrated ${migrated} menus with app field`)
    }
  }
}
