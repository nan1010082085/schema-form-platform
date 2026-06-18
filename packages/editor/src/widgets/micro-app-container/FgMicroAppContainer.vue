<script setup lang="ts">
/**
 * FgMicroAppContainer — 微应用容器 Widget
 *
 * 职责：
 * - 嵌入微应用（iframe 或 qiankun 模式）
 * - 支持 URL 模板变量（${variable}）
 * - 与宿主通信（postMessage）
 */
import { inject, computed, ref, onMounted, onUnmounted } from 'vue'
import { widgetDataKey } from '../base/types'
import MicroAppContainer from '@schema-form/shared-qiankun/MicroAppContainer.vue'
import { loadMicroApp } from 'qiankun'
import type { AppName } from '@schema-form/shared-qiankun/config'
import type { MicroAppMode } from '@schema-form/shared-qiankun/useMicroApp'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

// 微应用配置
const microappMode = computed(() => (widgetData.value.props?.microappMode as MicroAppMode) ?? 'iframe')
const microappApp = computed(() => widgetData.value.props?.microappApp as AppName | undefined)
const microappBaseUrl = computed(() => (widgetData.value.props?.microappBaseUrl as string) || window.location.origin)

// URL 模板解析
const microappUrl = computed(() => {
  const urlTemplate = widgetData.value.props?.microappUrl as string
  if (!urlTemplate) return ''

  // 解析模板变量 ${xxx}
  const resolvedUrl = urlTemplate.replace(/\$\{(\w+)\}/g, (_, key) => {
    // 从上下文获取变量值
    return contextVariables.value[key] ?? ''
  })

  return `${microappBaseUrl.value}${resolvedUrl}`
})

// 上下文变量（从父组件或全局状态获取）
const contextVariables = computed(() => {
  // 可以从 widgetData.props?.variables 或全局状态获取
  return (widgetData.value.props?.variables as Record<string, string>) ?? {}
})

// 高度配置
const containerHeight = computed(() => {
  return (widgetData.value.props?.height as string) || '100%'
})

// 消息处理
const emit = defineEmits<{
  message: [data: any]
  ready: []
}>()

function handleMessage(event: MessageEvent) {
  emit('message', event.data)
}

function handleReady() {
  emit('ready')
}

// 发送消息到微应用
const containerRef = ref<any>(null)

function postMessage(data: any) {
  containerRef.value?.postMessage?.(data)
}

defineExpose({ postMessage })
</script>

<template>
  <div :class="styles.container" :style="{ height: containerHeight }">
    <!-- qiankun 模式 -->
    <MicroAppContainer
      v-if="microappMode === 'qiankun' && microappApp"
      ref="containerRef"
      :app-name="microappApp"
      mode="qiankun"
      :load-micro-app="loadMicroApp"
      height="100%"
      @ready="handleReady"
      @message="handleMessage"
    />

    <!-- iframe 模式 -->
    <MicroAppContainer
      v-else-if="microappUrl"
      ref="containerRef"
      :app-name="'flow'"
      mode="iframe"
      :src="microappUrl"
      height="100%"
      @ready="handleReady"
      @message="handleMessage"
    />

    <!-- 未配置时的占位 -->
    <div v-else :class="$style.placeholder">
      <span>请配置微应用 URL</span>
    </div>
  </div>
</template>

<style module>
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color);
}
</style>
