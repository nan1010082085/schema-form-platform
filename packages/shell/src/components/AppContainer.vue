<script setup lang="ts">
/**
 * AppContainer -- micro-app container
 *
 * Renders the appropriate child app based on route meta.
 * Supports two lookup paths:
 * 1. Built-in apps (editor/flow/ai) via getAppUrl from shared config
 * 2. Dynamic third-party apps via useMicroAppRegistry (fetched from API)
 *
 * Layout modes controlled by route meta:
 * - meta.microApp: load as micro-app (full-screen or with-menu depending on app config)
 * - no meta.microApp: shell's own admin page placeholder
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getAppUrl } from '@schema-form/micro-app/config'
import { useAuthStore } from '@/stores/auth'
import { useMicroAppRegistry } from '@/composables/useMicroAppRegistry'
import MicroAppLoader from './MicroAppLoader.vue'
import type { MicroAppConfig } from '@schema-form/micro-app/types'
import type { AppName } from '@schema-form/micro-app/config'

const route = useRoute()
const authStore = useAuthStore()
const { findByPath } = useMicroAppRegistry()

/** Built-in app names that have static config in shared/micro-app/config */
const BUILTIN_APPS = new Set<string>(['editor', 'flow', 'ai', 'admin', 'workflow'])

const microAppName = computed(() => route.meta?.microApp as string | undefined)

const microAppConfig = computed<MicroAppConfig | null>(() => {
  const name = microAppName.value
  if (!name) return null

  // Dynamic third-party app: look up by route param or activeRule
  if (name === 'dynamic') {
    const appName = route.params.appName as string
    if (!appName) return null

    // Try to find by activeRule matching /app/:appName
    const record = findByPath(`/${appName}`)
    if (!record) return null

    return {
      name: record.name,
      url: record.url,
      data: {
        token: authStore.token,
        refreshToken: authStore.refreshToken,
        userKey: authStore.userKey,
      },
    }
  }

  // Built-in apps use shared config
  const isBuiltin = BUILTIN_APPS.has(name)
  if (isBuiltin) {
    return {
      name,
      url: getAppUrl(name as AppName, import.meta.env.DEV),
      data: {
        token: authStore.token,
        refreshToken: authStore.refreshToken,
        userKey: authStore.userKey,
      },
    }
  }

  // Unknown app name -- try registry lookup
  const record = findByPath(`/${name}`)
  if (!record) return null

  return {
    name: record.name,
    url: record.url,
    data: {
      token: authStore.token,
      refreshToken: authStore.refreshToken,
      userKey: authStore.userKey,
    },
  }
})
</script>

<template>
  <!-- Micro-app mode: render child app -->
  <MicroAppLoader v-if="microAppConfig" :config="microAppConfig" />

  <!-- Admin page mode: placeholder for shell's own pages -->
  <div v-else :class="$style.placeholder">
    <div :class="$style.content">
      <h2 :class="$style.title">{{ route.meta?.title || 'Page' }}</h2>
      <p :class="$style.desc">This page is under construction.</p>
    </div>
  </div>
</template>

<style module>
.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color-page, #f5f7fa);
}

.content {
  text-align: center;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color-primary, #303133);
  margin-bottom: 8px;
}

.desc {
  font-size: 14px;
  color: var(--text-color-secondary, #909399);
}
</style>
