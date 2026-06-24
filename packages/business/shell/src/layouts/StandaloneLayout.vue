<script setup lang="ts">
/**
 * StandaloneLayout — full-screen micro-app container
 *
 * No sidebar, no header, no chrome.
 * Mounts a micro-app directly via loadMicroApp.
 * Used for apps configured with layout: 'without-menu' in standalone mode.
 */
import { computed } from 'vue'
import { useMicroAppStore } from '@/stores/microApp'
import { APP_CONFIGS } from '@schema-form/platform-shared/qiankun/config'
import MicroAppContainer from '@/components/MicroAppContainer.vue'

const props = defineProps<{
  appName: string
}>()

const microAppStore = useMicroAppStore()

const appEntry = computed(() => {
  const entry = microAppStore.getAppEntry(props.appName)
  if (entry) return entry
  // Fallback to APP_CONFIGS
  const config = APP_CONFIGS[props.appName as keyof typeof APP_CONFIGS]
  if (config) {
    const isDev = import.meta.env.DEV
    return isDev
      ? `//localhost:${config.devPort}${config.basePath}`
      : `//${window.location.host}${config.basePath}`
  }
  return ''
})
</script>

<template>
  <div :class="$style.standalone">
    <MicroAppContainer
      v-if="props.appName && appEntry"
      :app-name="props.appName"
      :entry="appEntry"
    />
    <div v-else :class="$style.notFound">
      <p>应用 "{{ props.appName }}" 未找到</p>
    </div>
  </div>
</template>

<style module>
.standalone {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-color-page);
}

.notFound {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-color-secondary);
  font-size: 16px;
}
</style>
