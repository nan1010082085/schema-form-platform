<script setup lang="ts">
/**
 * MicroAppContainer — micro-app mounting point
 *
 * Reusable component that mounts a qiankun micro-app via loadMicroApp.
 * Used by ClassicSidebarLayout and DynamicLayout (for standalone apps).
 *
 * Responsibilities:
 * - Mount micro-app when appName prop is provided
 * - Unmount on prop change or component unmount
 * - Watch route changes for same-app navigation
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { loadMicroApp } from 'qiankun'

const props = defineProps({
  appName: { type: String, required: true },
  entry: { type: String, required: true },
})

const route = useRoute()

const containerRef = ref<HTMLDivElement>()
const loading = ref(true)
let microAppInstance: ReturnType<typeof loadMicroApp> | null = null

async function mountMicroApp(): Promise<void> {
  if (!containerRef.value || !props.entry) {
    loading.value = false
    return
  }

  loading.value = true

  // Unmount previous instance if exists
  if (microAppInstance) {
    try {
      await microAppInstance.unmount()
    } catch { /* ignore */ }
    microAppInstance = null
  }

  try {
    microAppInstance = loadMicroApp(
      {
        name: props.appName,
        entry: props.entry,
        container: containerRef.value,
      },
      { sandbox: { strictStyleIsolation: true, experimentalStyleIsolation: false } },
    )
    await microAppInstance.mountPromise
  } catch (err) {
    console.error(`[MicroAppContainer] Failed to mount ${props.appName}:`, err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  mountMicroApp()
})

// Watch for route changes within the same micro-app
watch(() => route.fullPath, () => {
  if (containerRef.value) {
    mountMicroApp()
  }
})

onUnmounted(() => {
  if (microAppInstance) {
    microAppInstance.unmount().catch(() => {})
    microAppInstance = null
  }
})
</script>

<template>
  <div :class="$style.container">
    <div v-if="loading" :class="$style.loading">
      <div :class="$style.spinner" />
      <span :class="$style.loadingText">加载中...</span>
    </div>
    <div ref="containerRef" :class="$style.microContainer" />
  </div>
</template>

<style module>
.container {
  width: 100%;
  height: 100%;
  position: relative;
}

.loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-color-page);
  z-index: 10;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color-light);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loadingText {
  font-size: 14px;
  color: var(--text-color-secondary);
}

.microContainer {
  width: 100%;
  height: 100%;
}
</style>
