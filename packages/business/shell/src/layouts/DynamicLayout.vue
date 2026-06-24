<script setup lang="ts">
/**
 * DynamicLayout — route-driven layout switcher
 *
 * Selects layout based on the current route:
 * - No app param → HomeView (inside ClassicSidebarLayout shell)
 * - Standalone route → StandaloneLayout (full-screen)
 * - With-menu app → ClassicSidebarLayout (sidebar + header)
 * - Without-menu app → ClassicSidebarLayout without sidebar
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMicroAppStore } from '@/stores/microApp'
import { APP_CONFIGS } from '@schema-form/platform-shared/qiankun/config'
import ClassicSidebarLayout from './ClassicSidebarLayout.vue'
import StandaloneLayout from './StandaloneLayout.vue'

const route = useRoute()
const microAppStore = useMicroAppStore()

const isStandalone = computed(() => route.name === 'standalone-app')
const currentApp = computed(() => route.params.app as string || '')

const withoutMenu = computed(() => {
  if (!currentApp.value) return false
  // Check micro-app store first
  const appConfig = microAppStore.getApp(currentApp.value)
  if (appConfig) return appConfig.layout === 'without-menu'
  // Fallback to APP_CONFIGS (editor and ai are without-menu)
  const config = APP_CONFIGS[currentApp.value as keyof typeof APP_CONFIGS]
  if (config) {
    return currentApp.value === 'editor' || currentApp.value === 'ai'
  }
  return false
})
</script>

<template>
  <!-- Standalone micro-app (full-screen, no shell chrome) -->
  <StandaloneLayout v-if="isStandalone && currentApp" :app-name="currentApp" />

  <!-- All other routes: sidebar layout with optional menu -->
  <ClassicSidebarLayout v-else :without-menu="withoutMenu" />
</template>
