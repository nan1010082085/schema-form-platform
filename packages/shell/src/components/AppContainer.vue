<script setup lang="ts">
/**
 * AppContainer -- micro-app container
 *
 * Renders the appropriate child app (editor/flow/ai) based on route meta.
 * Also handles "with-menu" layout pages (admin pages rendered inside shell).
 * When route has meta.microApp, it loads the corresponding micro-app.
 * Otherwise, it shows a placeholder for the shell's own admin pages.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getAppUrl } from '@schema-form/micro-app/config'
import { useAuthStore } from '@/stores/auth'
import MicroAppLoader from './MicroAppLoader.vue'
import type { MicroAppConfig } from '@schema-form/micro-app/types'

const route = useRoute()
const authStore = useAuthStore()

const microAppName = computed(() => route.meta?.microApp as string | undefined)

const microAppConfig = computed<MicroAppConfig | null>(() => {
  const name = microAppName.value
  if (!name) return null
  return {
    name,
    url: getAppUrl(name as 'editor' | 'flow' | 'ai', import.meta.env.DEV),
    data: { token: authStore.token },
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
  background: #f5f7fa;
}

.content {
  text-align: center;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.desc {
  font-size: 14px;
  color: #909399;
}
</style>
