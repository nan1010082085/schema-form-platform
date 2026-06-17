<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <el-alert
    :title="(widgetData.props?.text as string) || '提示信息'"
    :type="(widgetData.props?.type as 'info' | 'success' | 'warning' | 'error') || 'info'"
    :closable="widgetData.props?.closable !== false"
  />
</template>
