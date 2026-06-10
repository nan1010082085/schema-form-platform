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
}

// Stable UUIDs for each menu item (deterministic via https://www.uuidgenerator.net/)
const IDS = {
  SYSTEM:    'a1b2c3d4-0001-4000-8000-000000000001',
  MICROAPP:  'a1b2c3d4-0002-4000-8000-000000000002',
  MENU_MGMT: 'a1b2c3d4-0003-4000-8000-000000000003',
  USER:      'a1b2c3d4-0004-4000-8000-000000000004',
  ROLE:      'a1b2c3d4-0005-4000-8000-000000000005',
  DEPT:      'a1b2c3d4-0006-4000-8000-000000000006',
  POST:      'a1b2c3d4-0007-4000-8000-000000000007',
  DICT:      'a1b2c3d4-0008-4000-8000-000000000008',
  CONFIG:    'a1b2c3d4-0009-4000-8000-000000000009',
  LOGS:      'a1b2c3d4-000a-4000-8000-00000000000a',
  EDITOR:    'a1b2c3d4-000b-4000-8000-00000000000b',
  FLOW:      'a1b2c3d4-000c-4000-8000-00000000000c',
  FLOW_DESIGN:  'a1b2c3d4-000d-4000-8000-00000000000d',
  FLOW_MONITOR: 'a1b2c3d4-000e-4000-8000-00000000000e',
  FLOW_APPROVE: 'a1b2c3d4-000f-4000-8000-00000000000f',
  AI_APP:       'a1b2c3d4-0010-4000-8000-000000000010',
} as const

const MENUS: MenuSeed[] = [
  // ── 系统管理 (目录) ──
  { _id: IDS.SYSTEM,    parentId: null,           name: '系统管理',  path: '',               icon: 'Setting',    type: 'menu', permission: '',              sort: 1,  microAppId: null },
  { _id: IDS.MICROAPP,  parentId: IDS.SYSTEM,     name: '微应用管理', path: '/admin/micro-apps', icon: 'Grid',       type: 'menu', permission: 'microapp:view', sort: 1,  microAppId: 'admin' },
  { _id: IDS.MENU_MGMT, parentId: IDS.SYSTEM,     name: '菜单管理',  path: '/admin/menus',     icon: 'Menu',       type: 'menu', permission: 'menu:view',     sort: 2,  microAppId: 'admin' },
  { _id: IDS.USER,      parentId: IDS.SYSTEM,     name: '用户管理',  path: '/admin/users',     icon: 'User',       type: 'menu', permission: 'user:view',     sort: 3,  microAppId: 'admin' },
  { _id: IDS.ROLE,      parentId: IDS.SYSTEM,     name: '角色管理',  path: '/admin/roles',     icon: 'UserFilled', type: 'menu', permission: 'role:view',     sort: 4,  microAppId: 'admin' },
  { _id: IDS.DEPT,      parentId: IDS.SYSTEM,     name: '部门管理',  path: '/admin/depts',     icon: 'OfficeBuilding', type: 'menu', permission: 'dept:view', sort: 5,  microAppId: 'admin' },
  { _id: IDS.POST,      parentId: IDS.SYSTEM,     name: '岗位管理',  path: '/admin/posts',     icon: 'Postcard',   type: 'menu', permission: 'post:view',     sort: 6,  microAppId: 'admin' },
  { _id: IDS.DICT,      parentId: IDS.SYSTEM,     name: '字典管理',  path: '/admin/dict',      icon: 'Collection', type: 'menu', permission: 'dict:view',     sort: 7,  microAppId: 'admin' },
  { _id: IDS.CONFIG,    parentId: IDS.SYSTEM,     name: '参数设置',  path: '/admin/config',    icon: 'Tools',      type: 'menu', permission: 'config:view',   sort: 8,  microAppId: 'admin' },
  { _id: IDS.LOGS,      parentId: IDS.SYSTEM,     name: '操作日志',  path: '/admin/logs',      icon: 'Document',   type: 'menu', permission: 'audit:view',    sort: 9,  microAppId: 'admin' },

  // ── 表单设计器 ──
  { _id: IDS.EDITOR,    parentId: null,           name: '表单设计器', path: '/editor',          icon: 'EditPen',    type: 'menu', permission: '',              sort: 2,  microAppId: 'editor' },

  // ── 流程管理 (目录) ──
  { _id: IDS.FLOW,          parentId: null,       name: '流程管理',  path: '',                 icon: 'Connection', type: 'menu', permission: '',            sort: 3,  microAppId: null },
  { _id: IDS.FLOW_DESIGN,   parentId: IDS.FLOW,   name: '流程设计',  path: '/flow/design',     icon: 'Edit',       type: 'menu', permission: 'flow:design',   sort: 1,  microAppId: 'flow' },
  { _id: IDS.FLOW_MONITOR,  parentId: IDS.FLOW,   name: '流程监控',  path: '/flow/monitor',    icon: 'Monitor',    type: 'menu', permission: 'flow:view',     sort: 2,  microAppId: 'flow' },
  { _id: IDS.FLOW_APPROVE,  parentId: IDS.FLOW,   name: '审批中心',  path: '/flow/approval',   icon: 'Stamp',      type: 'menu', permission: 'flow:approve',  sort: 3,  microAppId: 'flow' },

  // ── AI 应用 ──
  { _id: IDS.AI_APP,    parentId: null,           name: 'AI 应用',   path: '/ai',              icon: 'MagicStick', type: 'menu', permission: '',              sort: 4,  microAppId: 'ai-app' },
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
