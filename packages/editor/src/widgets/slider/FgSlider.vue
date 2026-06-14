<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))

const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
}))
</script>

<template>
  <div :class="styles.wrapper">
    <t-slider
      v-model="widgetData.defaultValue as number"
      :style="dynamicStyle"
      :min="(widgetData.props?.min as number) ?? 0"
      :max="(widgetData.props?.max as number) ?? 100"
      :step="(widgetData.props?.step as number) ?? 1"
      :show-input="(widgetData.props?.showInput as boolean) || false"
      :show-step="(widgetData.props?.showStops as boolean) || false"
      :tooltip="(widgetData.props?.showTooltip as boolean) ?? true"
      :disabled="isDisabled"
      :range="(widgetData.props?.range as boolean) || false"
    />
  </div>
</template>
