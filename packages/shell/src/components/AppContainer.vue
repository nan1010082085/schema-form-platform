<script setup lang="ts">
/**
 * AppContainer — 微应用容器
 *
 * 根据路由参数决定加载哪个微应用：
 * - route.params.app → 微应用名称（editor / flow / ai / admin）
 * - route.meta.microApp → 兼容直接指定的情况
 *
 * qiankun 通过 activeRule 匹配后自动挂载到 #micro-container。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MicroAppLoader from './MicroAppLoader.vue'

const route = useRoute()

const microAppName = computed(() => {
  return (route.params.app as string) || (route.meta?.microApp as string) || ''
})

const isMicroApp = computed(() => !!microAppName.value)
</script>

<template>
  <MicroAppLoader v-if="isMicroApp" />

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
