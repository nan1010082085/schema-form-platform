<script setup lang="ts">
/**
 * FgMicroAppContainer — 微应用容器 Widget
 *
 * 通过 qiankun loadMicroApp 加载子应用（editor/flow/ai）
 * 支持变量传参，与子应用通信（postMessage）
 */
import { inject, computed, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import MicroAppContainer from '@schema-form/shared-qiankun/MicroAppContainer.vue'
import { loadMicroApp } from 'qiankun'
import type { AppName } from '@schema-form/shared-qiankun/config'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

const microappApp = computed(() => widgetData.value.props?.microappApp as AppName | undefined)
const containerHeight = computed(() => (widgetData.value.props?.height as string) || '100%')
const contextVariables = computed(() => (widgetData.value.props?.variables as Record<string, string>) ?? {})

const emit = defineEmits<{
  message: [data: any]
  ready: []
}>()

const containerRef = ref<any>(null)

function postMessage(data: any) {
  containerRef.value?.postMessage?.(data)
}

defineExpose({ postMessage })
</script>

<template>
  <div :class="styles.container" :style="{ height: containerHeight }">
    <MicroAppContainer
      v-if="microappApp"
      ref="containerRef"
      :app-name="microappApp"
      mode="qiankun"
      :load-micro-app="loadMicroApp"
      height="100%"
      @ready="emit('ready')"
      @message="emit('message', $event)"
    />
    <div v-else :class="$style.placeholder">
      <span>请选择子应用</span>
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
