<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { EVENT_CONTEXT_KEY } from '../../components/WidgetRenderer/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { triggerWidgetEvent } from '../../engine/eventEngine'
import type { ToolbarButtonItem } from './config'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()
const eventCtx = inject(EVENT_CONTEXT_KEY, null)

const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))

const buttons = computed<ToolbarButtonItem[]>(() => {
  return (widgetData.value.props?.buttons as ToolbarButtonItem[]) || []
})

async function handleClick(idx: number) {
  if (eventCtx) {
    await triggerWidgetEvent(widgetData.value, 'click', eventCtx, `btn-${idx}`)
  }
}
</script>

<template>
  <div :style="dynamicStyle">
    <el-button
      v-for="(btn, idx) in buttons"
      :key="idx"
      :type="(btn.type as 'primary' | 'success' | 'warning' | 'danger' | 'info' | '') || undefined"
      :disabled="isDisabled"
      @click="handleClick(idx)"
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
</style>
