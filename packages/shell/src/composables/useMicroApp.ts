/**
 * useMicroApp -- micro-app loading logic
 *
 * Responsibilities:
 * - Build MicroAppConfig with correct URL and auth data
 * - Provide config objects for each child app (editor, flow, ai)
 * - Pass token to child apps via micro-app data prop
 *
 * Dependencies:
 * - useAuthStore (token for child app auth)
 * - @schema-form/micro-app/config (getAppUrl)
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { getAppUrl } from '@schema-form/micro-app/config'
import { useAuthStore } from '@/stores/auth'
import type { MicroAppConfig } from '@schema-form/micro-app/types'

export function useMicroApp() {
  const authStore = useAuthStore()
  const { token } = storeToRefs(authStore)

  /** Build config for a named child app */
  function getConfig(appName: 'editor' | 'flow' | 'ai'): MicroAppConfig {
    return {
      name: appName,
      url: getAppUrl(appName, import.meta.env.DEV),
      data: {
        token: token.value,
      },
    }
  }

  const editorConfig = computed<MicroAppConfig>(() => getConfig('editor'))
  const flowConfig = computed<MicroAppConfig>(() => getConfig('flow'))
  const aiConfig = computed<MicroAppConfig>(() => getConfig('ai'))

  return {
    getConfig,
    editorConfig,
    flowConfig,
    aiConfig,
  }
}
