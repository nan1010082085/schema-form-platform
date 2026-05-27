<script setup lang="ts">
import { inject, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useExposeWidget } from '../../composables/useExposeWidget'
const widgetData = inject(widgetDataKey)!
const tableData = ref<Record<string, unknown>[]>([])
useExposeWidget(() => ({
  get tableData() { return tableData.value },
}))
</script>
<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <span :class="$style.title">{{ (widgetData.props?.title as string) || '可编辑表格' }}</span>
      <el-button v-if="widgetData.props?.showAddButton" type="primary" size="small">
        {{ (widgetData.props?.addButtonText as string) || '添加行' }}
      </el-button>
    </div>
    <el-table :data="[]" border />
  </div>
</template>
<style module>
.container { display: flex; flex-direction: column; height: 100%; border: 1px solid #ebeef5; border-radius: 4px; }
.header { padding: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ebeef5; }
.title { font-weight: 600; }
</style>
