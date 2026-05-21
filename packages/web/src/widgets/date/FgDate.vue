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

const pickerType = computed(() => {
  const t = widgetData.value.props?.type as string
  if (t === 'datetime' || t === 'daterange') return t
  return 'date'
})
</script>

<template>
  <el-date-picker
    v-model="widgetData.defaultValue"
    :style="dynamicStyle"
    :type="pickerType"
    :placeholder="(widgetData.props?.placeholder as string) || '请选择日期'"
    :disabled="isDisabled"
    :clearable="(widgetData.props?.clearable as boolean) ?? true"
    :format="(widgetData.props?.format as string) || 'YYYY-MM-DD'"
  />
</template>

<style scoped>
:deep(.el-date-editor) {
  width: 100% !important;
  height: 100%;
}
:deep(.el-input__wrapper) {
  height: 100%;
}
</style>
