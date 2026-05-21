<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import type { ButtonItem } from './config'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))

const buttons = computed<ButtonItem[]>(() => {
  return (widgetData.value.props?.buttons as ButtonItem[]) || []
})
</script>

<template>
  <div :style="dynamicStyle">
    <el-button
      v-for="(btn, idx) in buttons"
      :key="idx"
      :type="(btn.type as 'primary' | 'success' | 'warning' | 'danger' | 'info' | '') || ''"
      :disabled="isDisabled"
    >
      {{ btn.text }}
    </el-button>
  </div>
</template>

<style scoped>
div {
  display: flex;
  gap: 8px;
  align-items: center;
}
:deep(.el-button) {
  flex: 1;
  height: 100%;
}
</style>
