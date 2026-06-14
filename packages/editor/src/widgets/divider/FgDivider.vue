<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!

const dynamicStyle = computed(() => ({
  margin: widgetStyle.value?.margin as string,
  padding: widgetStyle.value?.padding as string,
}))

const content = computed(() => widgetData.value.props?.content as string || '')
</script>

<template>
  <t-divider
    :style="dynamicStyle"
    :layout="(widgetData.props?.direction as 'horizontal' | 'vertical') || 'horizontal'"
    :align="(widgetData.props?.contentPosition as 'left' | 'center' | 'right') || 'center'"
    :content="content"
  />
</template>
