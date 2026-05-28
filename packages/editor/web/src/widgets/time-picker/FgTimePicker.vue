<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))

const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
}))

const pickerRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  pickerRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>

<template>
  <el-time-picker
    ref="pickerRef"
    v-model="widgetData.defaultValue as any"
    :style="dynamicStyle"
    :placeholder="(widgetData.props?.placeholder as string) || '请选择时间'"
    :disabled="isDisabled"
    :readonly="(widgetData.props?.readonly as boolean) || false"
    :clearable="(widgetData.props?.clearable as boolean) ?? true"
    :is-range="(widgetData.props?.isRange as boolean) || false"
    :format="(widgetData.props?.format as string) || 'HH:mm:ss'"
    :arrow-control="(widgetData.props?.arrowControl as boolean) || false"
    @change="forwardNativeChange"
  />
</template>

<style scoped>
:deep(.el-time-picker) {
  width: 100%;
}
</style>
