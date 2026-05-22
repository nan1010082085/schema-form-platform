<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!

const dynamicStyle = computed(() => ({
  height: `${widgetData.props?.height ?? 20}px`,
  margin: widgetStyle.value?.margin as string,
  padding: widgetStyle.value?.padding as string,
  backgroundColor: widgetStyle.value?.backgroundColor as string,
}))
</script>

<template>
  <div :style="dynamicStyle" />
</template>
