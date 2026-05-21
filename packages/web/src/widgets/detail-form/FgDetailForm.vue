<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <div :class="$style.container">
    <div :class="$style.title">{{ (widgetData.props?.title as string) || '详情' }}</div>
    <el-descriptions :column="(widgetData.props?.columns as number) || 2" :border="widgetData.props?.bordered !== false" />
  </div>
</template>
<style module>
.container { width: 100%; }
.title { font-weight: 600; margin-bottom: 12px; font-size: 16px; }
</style>
