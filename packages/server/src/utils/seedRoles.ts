import { RoleModel } from '../models/Role.js'
import { DEFAULT_TENANT_ID } from './initDefaultTenant.js'

/**
 * 创建默认角色
 *
 * admin 角色拥有所有权限
 */
export async function seedRoles(): Promise<void> {
  const existing = await RoleModel.findOne({
    name: '管理员',
    tenantId: DEFAULT_TENANT_ID,
  })

  if (existing) {
    console.log('[seed] Admin role already exists')
    return
  }

  // 获取所有权限码
  const allPermissions = [
    'microapp:view', 'microapp:create', 'microapp:edit', 'microapp:delete',
    'menu:view', 'menu:create', 'menu:edit', 'menu:delete',
    'user:view', 'user:create', 'user:edit', 'user:delete', 'user:reset-password',
    'role:view', 'role:create', 'role:edit', 'role:delete',
    'dept:view', 'dept:create', 'dept:edit', 'dept:delete',
    'post:view', 'post:create', 'post:edit', 'post:delete',
    'dict:view', 'dict:create', 'dict:edit', 'dict:delete',
    'config:view', 'config:create', 'config:edit', 'config:delete',
    'audit:view', 'audit:export',
    'schema:view', 'schema:create', 'schema:edit', 'schema:delete', 'schema:publish',
    'flow:view', 'flow:create', 'flow:edit', 'flow:delete', 'flow:design', 'flow:approve', 'flow:monitor',
  ]

  await RoleModel.create({
    name: '管理员',
    permissions: allPermissions,
    data_scope: 'all',
    tenantId: DEFAULT_TENANT_ID,
  })

  console.log('[seed] Admin role created with all permissions')
}
