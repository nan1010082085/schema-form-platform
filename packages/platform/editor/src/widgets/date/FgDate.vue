<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import './FgDate.module.scss'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))

const dynamicStyle = computed(() => ({
  width: '100%',
  height: `${widgetData.value.position?.h ?? 32}px`,
  '--el-component-size': `${widgetData.value.position?.h ?? 32}px`,
  '--el-component-size-small': `${widgetData.value.position?.h ?? 32}px`,
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))

const pickerType = computed(() => {
  const t = widgetData.value.props?.type as string
  if (t === 'datetime' || t === 'daterange') return t
  return 'date'
})

const pickerRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  pickerRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>

<template>
  <el-date-picker
    ref="pickerRef"
    v-model="widgetData.defaultValue"
    :style="dynamicStyle"
    :type="pickerType"
    :placeholder="(widgetData.props?.placeholder as string) || '请选择日期'"
    :disabled="isDisabled"
    :clearable="(widgetData.props?.clearable as boolean) ?? true"
    :format="(widgetData.props?.format as string) || 'YYYY-MM-DD'"
    @change="forwardNativeChange"
  />
</template>

