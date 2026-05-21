<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))
</script>

<template>
  <el-input-number
    v-model="widgetData.defaultValue as number"
    :style="dynamicStyle"
    :placeholder="(widgetData.props?.placeholder as string) || '请输入数字'"
    :disabled="isDisabled"
    :min="(widgetData.props?.min as number) || undefined"
    :max="(widgetData.props?.max as number) || undefined"
    :step="(widgetData.props?.step as number) ?? 1"
    :precision="(widgetData.props?.precision as number) || undefined"
    controls-position="right"
  />
</template>

<style scoped>
:deep(.el-input-number) {
  width: 100%;
  height: 100%;
}
:deep(.el-input__wrapper) {
  height: 100%;
}
</style>
