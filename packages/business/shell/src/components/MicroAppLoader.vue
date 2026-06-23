<script setup lang="ts">
/**
 * MicroAppLoader -- qiankun micro-app container
 *
 * Provides the #micro-container div where qiankun mounts child apps.
 * Shows loading state while qiankun is initializing.
 */
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isReady = ref(false)

onMounted(() => {
  // Qiankun will mount to #micro-container when route matches
  isReady.value = true
  console.log('[MicroAppLoader] mounted', {
    path: route.path,
    microApp: route.meta?.microApp,
    containerExists: !!document.getElementById('micro-container'),
  })
})

// 监听路由变化
watch(() => route.path, (newPath, oldPath) => {
  console.log('[MicroAppLoader] route changed', {
    from: oldPath,
    to: newPath,
    microApp: route.meta?.microApp,
  })
})

onUnmounted(() => {
  console.log('[MicroAppLoader] unmounted')
})
</script>

<template>
  <div :class="$style.container">
    <!-- Loading overlay (shown briefly during initial mount) -->
    <div v-if="!isReady" :class="$style.overlay">
      <div :class="$style.spinner">
        <div :class="$style.spinnerInner"></div>
      </div>
      <div :class="$style.loadingText">加载中...</div>
    </div>

    <!-- Qiankun mounts child apps here -->
    <div id="micro-container" :class="$style.microContainer"></div>
  </div>
</template>

<style module>
.container {
  width: 100%;
  height: 100%;
  position: relative;
}

.overlay {
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
  width: 40px;
  height: 40px;
  margin-bottom: 16px;
}

.spinnerInner {
  width: 100%;
  height: 100%;
  border: 3px solid var(--border-color-light);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
