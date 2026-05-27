<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <div :class="$style.container">
    <div :class="$style.header">{{ (widgetData.props?.title as string) || '树形布局' }}</div>
    <el-input v-if="widgetData.props?.showSearch" placeholder="搜索" size="small" :class="$style.search" />
    <div :class="$style.body">树形内容区域</div>
  </div>
</template>
<style module>
.container { border: 1px solid #ebeef5; border-radius: 4px; display: flex; flex-direction: column; height: 100%; }
.header { padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #ebeef5; }
.search { margin: 8px 12px; }
.body { flex: 1; padding: 12px; color: #909399; }
</style>
