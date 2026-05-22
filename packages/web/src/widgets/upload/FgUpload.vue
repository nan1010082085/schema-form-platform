<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <el-upload action="#" :accept="(widgetData.props?.accept as string)" :multiple="widgetData.props?.multiple" :limit="(widgetData.props?.limit as number)">
    <el-button type="primary">{{ (widgetData.props?.buttonText as string) || '点击上传' }}</el-button>
  </el-upload>
</template>
<style scoped>
:deep(.el-upload) {
  width: 100%;
  height: 100%;
}
:deep(.el-button) {
  height: 100%;
}
</style>
