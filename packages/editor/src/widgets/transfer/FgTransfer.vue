<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useExposeWidget } from '../../composables/useExposeWidget'
const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const value = ref<Array<string | number>>([])
useExposeWidget(() => ({
  get value() { return value.value },
}))
const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))
const titles = computed(() => [
  (widgetData.value.props?.leftTitle as string) || '待选',
  (widgetData.value.props?.rightTitle as string) || '已选',
])

/** 根据 position.w 计算每个面板的宽度：(总宽 - 按钮区 - 间距) / 2 */
const panelWidth = computed(() => {
  const totalW = widgetData.value.position?.w ?? 700
  const btnArea = 124
  return Math.max(0, (totalW - btnArea) / 2)
})

const transferStyle = computed(() => ({
  ...dynamicStyle.value,
  '--transfer-panel-width': `${panelWidth.value}px`,
}))
</script>
<template>
  <t-transfer
    :data="[]"
    :title="titles"
    :search="widgetData.props?.filterable !== false"
    :style="transferStyle"
  />
</template>

<style scoped>
:deep(.t-transfer) {
  display: flex;
  width: 100%;
  height: 100%;
}
:deep(.t-transfer__buttons) {
  padding: 0 8px;
  flex-shrink: 0;
}
:deep(.t-transfer-panel) {
  width: var(--transfer-panel-width) !important;
}
</style>
