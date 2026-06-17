<script setup lang="ts">
/**
 * AppContainer -- micro-app container
 *
 * Renders the appropriate child app based on route meta.
 * Qiankun handles mounting/unmounting via route matching.
 *
 * Layout modes controlled by route meta:
 * - meta.microApp: load as micro-app (full-screen or with-menu depending on app config)
 * - no meta.microApp: shell's own admin page placeholder
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MicroAppLoader from './MicroAppLoader.vue'

const route = useRoute()

const isMicroApp = computed(() => !!route.meta?.microApp)
</script>

<template>
  <!-- Micro-app mode: render child app container -->
  <MicroAppLoader v-if="isMicroApp" />

  <!-- Admin page mode: placeholder for shell's own pages -->
  <div v-else :class="$style.placeholder">
    <div :class="$style.content">
      <h2 :class="$style.title">{{ route.meta?.title || '页面' }}</h2>
      <p :class="$style.desc">页面建设中...</p>
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
  background: var(--bg-color-page);
}

.content {
  text-align: center;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: 8px;
}

.desc {
  font-size: 14px;
  color: var(--text-color-secondary);
}
</style>
