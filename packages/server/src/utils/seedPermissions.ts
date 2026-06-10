import { PermissionModel } from '../models/Permission.js'

/**
 * 权限码定义
 * 格式：module:action
 * 每个模块包含 view/create/edit/delete 操作
 */
const PERMISSION_DEFINITIONS: Array<{ code: string; name: string; module: string; description?: string }> = [
  // ── Schema (表单) ──
  { code: 'schema:view', name: '查看表单', module: 'schema', description: '查看表单列表和详情' },
  { code: 'schema:create', name: '创建表单', module: 'schema', description: '创建新表单' },
  { code: 'schema:edit', name: '编辑表单', module: 'schema', description: '修改表单内容' },
  { code: 'schema:delete', name: '删除表单', module: 'schema', description: '删除表单' },
  { code: 'schema:publish', name: '发布表单', module: 'schema', description: '发布/取消发布表单' },

  // ── Flow (流程) ──
  { code: 'flow:view', name: '查看流程', module: 'flow', description: '查看流程列表和详情' },
  { code: 'flow:design', name: '设计流程', module: 'flow', description: '创建和编辑流程设计' },
  { code: 'flow:publish', name: '发布流程', module: 'flow', description: '发布流程设计' },
  { code: 'flow:approve', name: '审批流程', module: 'flow', description: '审批流程实例' },
  { code: 'flow:delete', name: '删除流程', module: 'flow', description: '删除流程设计' },

  // ── Tenant (租户) ──
  { code: 'tenant:view', name: '查看租户', module: 'system', description: '查看租户列表和详情' },
  { code: 'tenant:create', name: '创建租户', module: 'system', description: '创建新租户' },
  { code: 'tenant:edit', name: '编辑租户', module: 'system', description: '修改租户信息' },
  { code: 'tenant:delete', name: '删除租户', module: 'system', description: '删除租户' },

  // ── User (用户) ──
  { code: 'user:view', name: '查看用户', module: 'system', description: '查看用户列表和详情' },
  { code: 'user:create', name: '创建用户', module: 'system', description: '创建新用户' },
  { code: 'user:edit', name: '编辑用户', module: 'system', description: '修改用户信息' },
  { code: 'user:delete', name: '删除用户', module: 'system', description: '删除用户' },
  { code: 'user:reset-password', name: '重置密码', module: 'system', description: '重置用户密码' },

  // ── Role (角色) ──
  { code: 'role:view', name: '查看角色', module: 'system', description: '查看角色列表和详情' },
  { code: 'role:create', name: '创建角色', module: 'system', description: '创建新角色' },
  { code: 'role:edit', name: '编辑角色', module: 'system', description: '修改角色信息' },
  { code: 'role:delete', name: '删除角色', module: 'system', description: '删除角色' },

  // ── Menu (菜单) ──
  { code: 'menu:view', name: '查看菜单', module: 'system', description: '查看菜单列表和详情' },
  { code: 'menu:create', name: '创建菜单', module: 'system', description: '创建新菜单' },
  { code: 'menu:edit', name: '编辑菜单', module: 'system', description: '修改菜单信息' },
  { code: 'menu:delete', name: '删除菜单', module: 'system', description: '删除菜单' },

  // ── Dept (部门) ──
  { code: 'dept:view', name: '查看部门', module: 'system', description: '查看部门列表和详情' },
  { code: 'dept:create', name: '创建部门', module: 'system', description: '创建新部门' },
  { code: 'dept:edit', name: '编辑部门', module: 'system', description: '修改部门信息' },
  { code: 'dept:delete', name: '删除部门', module: 'system', description: '删除部门' },

  // ── Post (岗位) ──
  { code: 'post:view', name: '查看岗位', module: 'system', description: '查看岗位列表和详情' },
  { code: 'post:create', name: '创建岗位', module: 'system', description: '创建新岗位' },
  { code: 'post:edit', name: '编辑岗位', module: 'system', description: '修改岗位信息' },
  { code: 'post:delete', name: '删除岗位', module: 'system', description: '删除岗位' },

  // ── Dict (字典) ──
  { code: 'dict:view', name: '查看字典', module: 'system', description: '查看字典类型和数据' },
  { code: 'dict:create', name: '创建字典', module: 'system', description: '创建字典类型和数据' },
  { code: 'dict:edit', name: '编辑字典', module: 'system', description: '修改字典类型和数据' },
  { code: 'dict:delete', name: '删除字典', module: 'system', description: '删除字典类型和数据' },

  // ── Config (参数设置) ──
  { code: 'config:view', name: '查看参数', module: 'system', description: '查看系统参数列表和详情' },
  { code: 'config:create', name: '创建参数', module: 'system', description: '创建系统参数' },
  { code: 'config:edit', name: '编辑参数', module: 'system', description: '修改系统参数' },
  { code: 'config:delete', name: '删除参数', module: 'system', description: '删除系统参数' },

  // ── Audit (操作日志) ──
  { code: 'audit:view', name: '查看日志', module: 'system', description: '查看操作日志' },
  { code: 'audit:export', name: '导出日志', module: 'system', description: '导出操作日志' },
]

/**
 * 种子权限码数据
 * 使用 upsert 保证幂等：已存在的权限码不会被覆盖
 */
export async function seedPermissions(): Promise<void> {
  let created = 0

  for (const def of PERMISSION_DEFINITIONS) {
    const result = await PermissionModel.updateOne(
      { code: def.code },
      { $setOnInsert: def },
      { upsert: true },
    )
    if (result.upsertedCount > 0) created++
  }

  if (created > 0) {
    console.log(`[seed] Created ${created} permission codes (total ${PERMISSION_DEFINITIONS.length})`)
  }
}
