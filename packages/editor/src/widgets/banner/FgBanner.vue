<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <t-alert
    :title="(widgetData.props?.text as string) || '提示信息'"
    :theme="(widgetData.props?.type as 'info' | 'success' | 'warning' | 'error') || 'info'"
    :closeable="widgetData.props?.closable !== false"
  />
</template>
