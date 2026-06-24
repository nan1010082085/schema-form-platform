<script setup lang="ts">
import { inject, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import './FgDateTimeSlot.module.scss'
import { useExposeWidget } from '../../composables/useExposeWidget'

const widgetData = inject(widgetDataKey)!

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))

const pickerRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  pickerRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>
<template>
  <el-date-picker
    ref="pickerRef"
    type="datetimerange"
    :start-placeholder="(widgetData.props?.startPlaceholder as string) || '开始时间'"
    :end-placeholder="(widgetData.props?.endPlaceholder as string) || '结束时间'"
    :format="(widgetData.props?.format as string) || 'YYYY-MM-DD HH:mm:ss'"
    :range-separator="(widgetData.props?.rangeSeparator as string) || '至'"
    @change="forwardNativeChange"
  />
</template>

