<script setup lang="ts">
import { inject, computed, type CSSProperties } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!

const dynamicStyle = computed<CSSProperties>(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
  fontWeight: widgetStyle.value?.fontWeight as string,
  color: widgetStyle.value?.color as string,
  justifyContent: (widgetData.value.props?.align as string) || 'left',
}))

const tag = computed(() => {
  const level = widgetData.value.props?.level as number
  if (level >= 1 && level <= 4) return `h${level}`
  return 'h3'
})

const content = computed(() => {
  return (widgetData.value.props?.content as string) || '标题文字'
})
</script>

<template>
  <component :is="tag" :style="dynamicStyle">
    {{ content }}
  </component>
</template>

<style scoped>
h1, h2, h3, h4 {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  margin: 0;
}
</style>
