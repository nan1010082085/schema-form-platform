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
  <t-upload
    action="#"
    :accept="(widgetData.props?.accept as string)"
    :multiple="widgetData.props?.multiple"
    :max="(widgetData.props?.limit as number)"
    :auto-upload="false"
  >
    <t-button theme="primary">{{ (widgetData.props?.buttonText as string) || '点击上传' }}</t-button>
  </t-upload>
</template>
<style scoped>
:deep(.t-upload) {
  width: 100%;
  height: 100%;
}
:deep(.t-button) {
  height: 100%;
}
</style>
