<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <div :class="$style.container">
    <div :class="$style.title">{{ (widgetData.props?.title as string) || '附件' }}</div>
    <div :class="$style.empty">暂无文件</div>
  </div>
</template>
<style module>
.container { border: 1px solid #ebeef5; border-radius: 4px; padding: 12px; }
.title { font-weight: 600; margin-bottom: 8px; }
.empty { color: #909399; font-size: 13px; }
</style>
