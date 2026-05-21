<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
</script>
<template>
  <el-upload action="#" :accept="(widgetData.props?.accept as string)" :multiple="widgetData.props?.multiple" :limit="(widgetData.props?.limit as number)" :class="$style.upload">
    <el-button type="primary">{{ (widgetData.props?.buttonText as string) || '点击上传' }}</el-button>
  </el-upload>
</template>
<style module>
.upload { width: 100%; }
</style>
