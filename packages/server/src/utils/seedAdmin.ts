import { UserModel } from '../models/User.js'
import { DEFAULT_TENANT_ID } from './initDefaultTenant.js'

/**
 * 创建默认管理员账号
 *
 * 用户名: admin
 * 密码: admin123456
 * 租户: 默认租户 (000000)
 * 角色: admin
 */
export async function seedAdmin(): Promise<void> {
  const existing = await UserModel.findOne({
    username: 'admin',
    tenantId: DEFAULT_TENANT_ID,
  })

  if (existing) {
    console.log('[seed] Admin user already exists')
    return
  }

  await UserModel.create({
    username: 'admin',
    password: 'admin123456',
    displayName: '系统管理员',
    roles: ['admin'],
    tenantId: DEFAULT_TENANT_ID,
    status: 'active',
  })

  console.log('[seed] Admin user created: admin / admin123456')
}
