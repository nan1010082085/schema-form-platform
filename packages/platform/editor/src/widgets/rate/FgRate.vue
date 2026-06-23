<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'

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
  <el-rate
    v-model="widgetData.defaultValue as number"
    :style="dynamicStyle"
    :max="(widgetData.props?.max as number) ?? 5"
    :disabled="isDisabled"
    :allow-half="(widgetData.props?.allowHalf as boolean) || false"
    :show-text="(widgetData.props?.showText as boolean) || false"
    :show-score="(widgetData.props?.showScore as boolean) || false"
  />
</template>
