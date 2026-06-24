/**
 * Micro-app store
 *
 * Fetches and caches active micro-app configurations from the backend.
 * Provides helpers for layout components to mount micro-apps via loadMicroApp.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchActiveMicroApps, type MicroAppConfig } from '@/api/microAppApi'

export const useMicroAppStore = defineStore('microApp', () => {
  const apps = ref<MicroAppConfig[]>([])
  const loaded = ref(false)

  async function fetchApps(): Promise<void> {
    apps.value = await fetchActiveMicroApps()
    loaded.value = true
  }

  function getApp(name: string): MicroAppConfig | undefined {
    return apps.value.find(a => a.name === name || a.activeRule.includes(name))
  }

  function getAppEntry(name: string): string {
    const app = getApp(name)
    if (!app) return ''
    return app.url
  }

  const withMenuApps = computed(() => apps.value.filter(a => a.layout === 'with-menu'))
  const withoutMenuApps = computed(() => apps.value.filter(a => a.layout === 'without-menu'))

  return { apps, loaded, fetchApps, getApp, getAppEntry, withMenuApps, withoutMenuApps }
})
