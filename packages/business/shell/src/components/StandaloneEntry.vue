<script setup lang="ts">
/**
 * StandaloneEntry — entry 模式容器
 *
 * 通过 URL 参数直接加载微应用 entry 地址（loadMicroApp）。
 * 适用于未注册的微应用或外部系统嵌入。
 *
 * 用法：/standalone?entry=http://localhost:5100/schema-platform/editor/
 */
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { loadMicroApp } from 'qiankun'
import type { MicroApp } from 'qiankun'

const route = useRoute()
const containerRef = ref<HTMLDivElement>()
const loading = ref(true)

let microApp: MicroApp | null = null

const entryUrl = ref((route.query.entry as string) || '')
const appName = ref((route.query.name as string) || 'standalone-app')

async function mountApp() {
  if (!entryUrl.value || !containerRef.value) {
    loading.value = false
    return
  }

  loading.value = true

  // 卸载已有实例
  if (microApp) {
    await microApp.unmount().catch(() => {})
    microApp = null
  }

  try {
    microApp = loadMicroApp(
      {
        name: appName.value,
        entry: entryUrl.value,
        container: containerRef.value,
      },
      {
        sandbox: { experimentalStyleIsolation: true },
      },
    )
    await microApp.mountPromise
  } catch (err) {
    console.error('[StandaloneEntry] Failed to mount micro-app:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  mountApp()
})

// 监听 query 参数变化
watch(() => route.query.entry, (newEntry) => {
  entryUrl.value = (newEntry as string) || ''
  appName.value = (route.query.name as string) || 'standalone-app'
  nextTick(() => mountApp())
})

onUnmounted(() => {
  microApp?.unmount()
  microApp = null
})
</script>

<template>
  <div v-if="entryUrl" :class="$style.container">
    <div v-if="loading" :class="$style.loading">
      <div :class="$style.spinner" />
      <span>加载中...</span>
    </div>
    <div ref="containerRef" :class="$style.microContainer" />
  </div>

  <div v-else :class="$style.error">
    <p>缺少 entry 参数</p>
    <p :class="$style.hint">用法：/standalone?entry=微应用地址</p>
  </div>
</template>

<style module>
.container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
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

.microContainer {
  width: 100%;
  height: 100%;
}

.error {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
}

.hint {
  font-size: 13px;
  margin-top: 8px;
  opacity: 0.7;
}
</style>
