<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <el-tree-select
    :placeholder="(widgetData.props?.placeholder as string) || '请选择部门'"
    :clearable="widgetData.props?.clearable !== false"
    :multiple="widgetData.props?.multiple"
    :data="[]"
  />
</template>
