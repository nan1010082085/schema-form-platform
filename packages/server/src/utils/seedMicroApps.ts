import { MicroAppModel } from '../models/MicroApp.js'
import { DEFAULT_TENANT_ID } from './initDefaultTenant.js'

const DEFAULT_MICRO_APPS = [
  { name: '表单设计器', activeRule: '/editor', layout: 'without-menu', icon: 'Edit', url: '', sort: 1 },
  { name: '流程设计器', activeRule: '/flow', layout: 'with-menu', icon: 'Flow', url: '', sort: 2 },
  { name: '系统管理', activeRule: '/admin', layout: 'with-menu', icon: 'Setting', url: '', sort: 3 },
  { name: '门户', activeRule: '/portal', layout: 'with-menu', icon: 'Home', url: '', sort: 4 },
  { name: 'AI 应用', activeRule: '/ai', layout: 'without-menu', icon: 'Robot', url: '', sort: 5 },
]

/**
 * 种子微应用配置
 * 使用 upsert 保证幂等：按 (tenantId + activeRule) 去重，已存在的不会被覆盖
 */
export async function seedMicroApps(): Promise<void> {
  let created = 0

  for (const app of DEFAULT_MICRO_APPS) {
    const result = await MicroAppModel.updateOne(
      { tenantId: DEFAULT_TENANT_ID, activeRule: app.activeRule },
      { $setOnInsert: { ...app, tenantId: DEFAULT_TENANT_ID, status: 'active' } },
      { upsert: true },
    )
    if (result.upsertedCount > 0) created++
  }

  if (created > 0) {
    console.log(`[seed] Created ${created} micro apps (total ${DEFAULT_MICRO_APPS.length})`)
  }
}
