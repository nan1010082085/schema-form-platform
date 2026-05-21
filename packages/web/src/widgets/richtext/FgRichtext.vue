<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!

const dynamicStyle = computed(() => ({
  width: widgetStyle.value?.width as string || '100%',
  height: widgetStyle.value?.height as string || '200px',
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))
</script>

<template>
  <div
    :class="$style.richtext"
    :style="dynamicStyle"
  >
    <div :class="$style.toolbar">
      <span>B</span>
      <span>I</span>
      <span>U</span>
    </div>
    <div
      :class="$style.content"
      :contenteditable="!(widgetData.props?.readonly as boolean)"
    >
      {{ (widgetData.props?.placeholder as string) || '请输入内容' }}
    </div>
  </div>
</template>

<style module>
.richtext {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}
.toolbar {
  display: flex;
  gap: 8px;
  padding: 4px 8px;
  background: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  font-weight: bold;
}
.content {
  padding: 8px;
  min-height: 120px;
  color: #999;
  outline: none;
}
</style>
