<script setup lang="ts">
/**
 * SchemaPage — Schema 渲染页
 *
 * 通过 iframe 加载 editor 的 PublishView（/view?id=xxx），
 * 比 qiankun loadMicroApp 更轻量可靠。
 */
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { APP_CONFIGS } from '@schema-form/shared-qiankun/config'

const route = useRoute()
const loading = ref(true)
const error = ref('')

const schemaId = computed(() => route.params.schemaId as string)

const iframeSrc = computed(() => {
  if (!schemaId.value) return ''
  const config = APP_CONFIGS.editor
  const isDev = import.meta.env.DEV
  // 开发环境 base=/，生产环境 base=/schema-platform/editor/
  const base = isDev
    ? `http://localhost:${config.devPort}/`
    : `${window.location.origin}${config.basePath}`
  return `${base}view?id=${schemaId.value}`
})

function onIframeLoad() {
  loading.value = false
  console.log('[SchemaPage] iframe loaded:', iframeSrc.value)
}

function onIframeError() {
  loading.value = false
  error.value = '加载失败，请确认编辑器服务是否运行'
}
</script>

<template>
  <div :class="$style.page">
    <!-- Loading -->
    <div v-if="loading && !error" :class="$style.state">
      <span>加载渲染器...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" :class="$style.state">
      <span :style="{ color: 'var(--color-danger)' }">{{ error }}</span>
    </div>

    <!-- iframe -->
    <iframe
      v-if="schemaId"
      :src="iframeSrc"
      :class="$style.iframe"
      :style="{ visibility: loading ? 'hidden' : 'visible' }"
      @load="onIframeLoad"
      @error="onIframeError"
    />
  </div>
</template>

<style module>
.page {
  width: 100%;
  height: 100%;
  position: relative;
}

.state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
  font-size: 14px;
  z-index: 10;
  background: var(--bg-color-page);
}

.iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
