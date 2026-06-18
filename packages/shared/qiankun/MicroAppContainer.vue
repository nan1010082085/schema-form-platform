<script setup lang="ts">
/**
 * MicroAppContainer — 统一微应用嵌入容器
 *
 * 支持两种嵌入模式：
 * - iframe: 轻量级，postMessage 通信
 * - qiankun: 完整生命周期、沙箱隔离
 */
import { toRef, computed } from 'vue'
import { useMicroApp, type MicroAppMode, type LoadMicroAppFn } from './useMicroApp'
import type { AppName } from './config'

const props = withDefaults(defineProps<{
  /** 子应用名称 */
  appName: AppName
  /** 嵌入模式 */
  mode?: MicroAppMode
  /** 自定义 URL（覆盖默认 entry） */
  src?: string
  /** 附加到 URL 的查询参数 */
  query?: Record<string, string>
  /** 容器高度 */
  height?: string
  /** qiankun 模式的加载函数（从宿主注入） */
  loadMicroApp?: LoadMicroAppFn
}>(), {
  mode: 'iframe',
  height: '100%',
})

const emit = defineEmits<{
  ready: []
  error: [err: Error]
  message: [event: MessageEvent]
}>()

const { iframeUrl, loading, error, containerRef, postMessage } = useMicroApp({
  appName: props.appName,
  mode: props.mode,
  src: props.src ? toRef(props, 'src') : undefined,
  query: props.query ? toRef(props, 'query') : undefined,
  loadMicroApp: props.loadMicroApp,
})

function handleIframeLoad() {
  emit('ready')
}

const computedError = computed(() => error.value)

defineExpose({ postMessage, containerRef })
</script>

<template>
  <div
    ref="containerRef"
    :class="$style.container"
    :style="{ height }"
  >
    <!-- iframe 模式 -->
    <iframe
      v-if="mode === 'iframe' && iframeUrl"
      :src="iframeUrl"
      :class="$style.iframe"
      frameborder="0"
      @load="handleIframeLoad"
    />

    <!-- qiankun 模式：容器由 qiankun 接管 -->

    <!-- 加载状态 -->
    <div v-if="loading" :class="$style.loading">
      <slot name="loading">
        <span>加载中...</span>
      </slot>
    </div>

    <!-- 错误状态 -->
    <div v-if="computedError" :class="$style.error">
      <slot name="error" :error="computedError">
        <span>加载失败: {{ computedError.message }}</span>
      </slot>
    </div>
  </div>
</template>

<style module>
.container {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
}

.error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f56c6c;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
}
</style>
