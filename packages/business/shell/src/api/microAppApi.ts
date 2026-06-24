/**
 * Micro-app API client
 *
 * Fetches active micro-app configurations from the backend.
 * Used by useMicroAppStore to drive qiankun loadMicroApp dynamically.
 */
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'

export interface MicroAppConfig {
  id: string
  name: string
  url: string
  icon: string
  layout: 'with-menu' | 'without-menu'
  activeRule: string
  permissions: string[]
  status: 'active' | 'inactive'
  sort: number
}

export async function fetchActiveMicroApps(): Promise<MicroAppConfig[]> {
  const res = await apiClient.get<{ items: MicroAppConfig[] }>('/micro-apps?status=active&pageSize=100')
  return res.items
}
