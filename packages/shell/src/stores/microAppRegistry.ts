/**
 * useMicroAppRegistryStore -- dynamic micro-app registry state
 *
 * Responsibilities:
 * - Hold the list of active micro-apps fetched from API
 * - Provide lookup by activeRule for AppContainer routing
 *
 * Thin state holder — fetch logic lives in useMicroAppRegistry composable.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/** Micro-app record from API */
export interface MicroAppRecord {
  id: string
  name: string
  url: string
  icon: string
  layout: 'with-menu' | 'without-menu'
  activeRule: string
  permissions: string[]
  status: 'active' | 'inactive'
  sort: number
  createdAt: string
  updatedAt: string
}

export const useMicroAppRegistryStore = defineStore('microAppRegistry', () => {
  // ================================================================
  // State
  // ================================================================

  const apps = ref<MicroAppRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  // ================================================================
  // Getters
  // ================================================================

  /** Map of activeRule -> MicroAppRecord for fast lookup */
  const ruleMap = computed(() => {
    const map = new Map<string, MicroAppRecord>()
    for (const app of apps.value) {
      if (app.status === 'active') {
        map.set(app.activeRule, app)
      }
    }
    return map
  })

  /** Only active apps */
  const activeApps = computed(() =>
    apps.value.filter((a) => a.status === 'active').sort((a, b) => a.sort - b.sort),
  )

  // ================================================================
  // Actions (thin setters)
  // ================================================================

  function setApps(list: MicroAppRecord[]): void {
    apps.value = list
    loaded.value = true
  }

  function setLoading(value: boolean): void {
    loading.value = value
  }

  function setError(value: string | null): void {
    error.value = value
  }

  function reset(): void {
    apps.value = []
    loaded.value = false
    error.value = null
    loading.value = false
  }

  return {
    apps,
    loading,
    error,
    loaded,
    ruleMap,
    activeApps,
    setApps,
    setLoading,
    setError,
    reset,
  }
})
