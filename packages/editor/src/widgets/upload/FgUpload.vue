<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
import { useExposeWidget } from '../../composables/useExposeWidget'

const widgetData = inject(widgetDataKey)!

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))
</script>
<template>
  <el-upload action="#" :accept="(widgetData.props?.accept as string)" :multiple="widgetData.props?.multiple" :limit="(widgetData.props?.limit as number)">
    <t-button type="primary">{{ (widgetData.props?.buttonText as string) || '点击上传' }}</t-button>
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
