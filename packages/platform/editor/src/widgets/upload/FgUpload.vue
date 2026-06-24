<script setup lang="ts">
import { inject } from 'vue'
import { widgetDataKey } from '../base/types'
import './FgUpload.module.scss'
import { useExposeWidget } from '../../composables/useExposeWidget'

const widgetData = inject(widgetDataKey)!

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))
</script>
<template>
  <el-upload
    action="#"
    :accept="(widgetData.props?.accept as string)"
    :multiple="widgetData.props?.multiple"
    :limit="(widgetData.props?.limit as number)"
    :auto-upload="false"
  >
    <el-button type="primary">{{ (widgetData.props?.buttonText as string) || '点击上传' }}</el-button>
  </el-upload>
</template>
