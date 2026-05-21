<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <el-date-picker
    type="datetimerange"
    :start-placeholder="(widgetData.props?.startPlaceholder as string) || '开始时间'"
    :end-placeholder="(widgetData.props?.endPlaceholder as string) || '结束时间'"
    :format="(widgetData.props?.format as string) || 'YYYY-MM-DD HH:mm:ss'"
    :range-separator="(widgetData.props?.rangeSeparator as string) || '至'"
  />
</template>
