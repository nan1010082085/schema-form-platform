/**
 * useMicroAppRegistry -- fetch and manage dynamic micro-app list
 *
 * Responsibilities:
 * - Fetch active micro-apps from /api/micro-apps
 * - Populate useMicroAppRegistryStore
 * - Provide lookup by activeRule for AppContainer
 *
 * Dependencies:
 * - useMicroAppRegistryStore (state holder)
 * - apiClient (HTTP)
 */
import { storeToRefs } from 'pinia'
import { useMicroAppRegistryStore } from '@/stores/microAppRegistry'
import { apiClient } from '@schema-form/shared-utils/apiClient'
import type { MicroAppRecord } from '@/stores/microAppRegistry'

interface PagedResult {
  items: MicroAppRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useMicroAppRegistry() {
  const store = useMicroAppRegistryStore()
  const { apps, loading, error, loaded, ruleMap, activeApps } = storeToRefs(store)

  /** Fetch all active micro-apps (page size 100 to get all in one request) */
  async function fetchApps(): Promise<void> {
    store.setLoading(true)
    store.setError(null)
    try {
      const result = await apiClient.get<PagedResult>('/micro-apps?status=active&pageSize=100')
      store.setApps(result.items)
    } catch (e: unknown) {
      store.setError(e instanceof Error ? e.message : 'Failed to load micro-apps')
    } finally {
      store.setLoading(false)
    }
  }

  /** Find a micro-app config by matching URL path against activeRule */
  function findByPath(path: string): MicroAppRecord | undefined {
    for (const [rule, app] of ruleMap.value.entries()) {
      // activeRule can be a path prefix like "/editor" or a regex pattern
      if (path.startsWith(rule) || path.startsWith(`${rule}/`)) {
        return app
      }
    }
    return undefined
  }

  /** Reset state (called on logout) */
  function reset(): void {
    store.reset()
  }

  return {
    apps,
    loading,
    error,
    loaded,
    ruleMap,
    activeApps,
    fetchApps,
    findByPath,
    reset,
  }
}
