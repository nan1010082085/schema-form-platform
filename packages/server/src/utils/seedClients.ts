import { ClientModel } from '../models/Client.js'
import { DEFAULT_TENANT_ID } from './initDefaultTenant.js'

const PROD_ORIGIN = 'http://***REMOVED***:8828'

const DEFAULT_CLIENTS = [
  {
    clientId: 'shell',
    name: 'Shell 应用',
    redirectUris: ['http://localhost:5000/auth/callback', `${PROD_ORIGIN}/auth/callback`],
    type: 'public' as const,
  },
  {
    clientId: 'shell',
    name: '门户',
    redirectUris: ['http://localhost:4000/auth/callback', `${PROD_ORIGIN}/auth/callback`],
    type: 'public' as const,
  },
  {
    clientId: 'editor',
    name: '表单设计器',
    redirectUris: ['http://localhost:5100/auth/callback', `${PROD_ORIGIN}/editor/auth/callback`],
    type: 'public' as const,
  },
  {
    clientId: 'flow',
    name: '流程设计器',
    redirectUris: ['http://localhost:5200/auth/callback', `${PROD_ORIGIN}/flow/auth/callback`],
    type: 'public' as const,
  },
  {
    clientId: 'ai',
    name: 'AI 应用',
    redirectUris: ['http://localhost:5300/auth/callback', `${PROD_ORIGIN}/ai/auth/callback`],
    type: 'public' as const,
  },
  {
    clientId: 'admin',
    name: '系统管理',
    redirectUris: ['http://localhost:5400/auth/callback', `${PROD_ORIGIN}/admin/auth/callback`],
    type: 'public' as const,
  },
]

/**
 * 种子 SSO Client 配置
 * 使用 upsert 保证幂等：按 clientId 去重，已存在的不会被覆盖
 */
export async function seedClients(): Promise<void> {
  let created = 0

  for (const client of DEFAULT_CLIENTS) {
    const result = await ClientModel.updateOne(
      { clientId: client.clientId },
      {
        $setOnInsert: {
          ...client,
          secret: '',
          scopes: ['openid', 'profile', 'email'],
          status: 'active',
          tenantId: DEFAULT_TENANT_ID,
        },
      },
      { upsert: true },
    )
    if (result.upsertedCount > 0) created++
  }

  if (created > 0) {
    console.log(`[seed] Created ${created} SSO clients (total ${DEFAULT_CLIENTS.length})`)
  }
}
