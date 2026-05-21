<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <span :class="$style.title">{{ (widgetData.props?.title as string) || '列表' }}</span>
    </div>
    <el-table :data="[]" :stripe="widgetData.props?.stripe" :border="widgetData.props?.border" />
    <el-pagination v-if="widgetData.props?.showPagination" layout="total, prev, pager, next" :total="0" :page-size="(widgetData.props?.pageSize as number) || 10" :class="$style.pagination" />
  </div>
</template>
<style module>
.container { display: flex; flex-direction: column; height: 100%; border: 1px solid #ebeef5; border-radius: 4px; }
.header { padding: 12px; border-bottom: 1px solid #ebeef5; }
.title { font-weight: 600; }
.pagination { padding: 12px; display: flex; justify-content: flex-end; }
</style>
