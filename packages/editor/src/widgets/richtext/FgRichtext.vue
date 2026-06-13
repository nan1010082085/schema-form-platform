<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useExposeWidget } from '../../composables/useExposeWidget'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))

const dynamicStyle = computed(() => ({
  width: widgetStyle.value?.width as string || '100%',
  height: widgetStyle.value?.height as string || '200px',
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))
</script>

<template>
  <div
    :class="styles.richtext"
    :style="dynamicStyle"
  >
    <div :class="styles.toolbar">
      <span>B</span>
      <span>I</span>
      <span>U</span>
    </div>
    <div
      :class="styles.content"
      :contenteditable="!(widgetData.props?.readonly as boolean)"
    >
      {{ (widgetData.props?.placeholder as string) || '请输入内容' }}
    </div>
  </div>
</template>
