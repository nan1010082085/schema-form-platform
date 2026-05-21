<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <el-select
    :placeholder="(widgetData.props?.placeholder as string) || '请选择人员'"
    :clearable="widgetData.props?.clearable !== false"
    :multiple="widgetData.props?.multiple"
  >
    <el-option label="张三" value="zhangsan" />
    <el-option label="李四" value="lisi" />
  </el-select>
</template>
