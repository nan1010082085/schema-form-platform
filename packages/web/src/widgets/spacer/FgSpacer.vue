<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'

const widgetStyle = inject(widgetStyleKey)!

const dynamicStyle = computed(() => ({
  margin: widgetStyle.value?.margin as string,
  padding: widgetStyle.value?.padding as string,
  backgroundColor: widgetStyle.value?.backgroundColor as string,
}))
</script>

<template>
  <div :style="dynamicStyle" />
</template>
