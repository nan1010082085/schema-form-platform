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
  <el-color-picker
    v-model="widgetData.defaultValue as string"
    :style="dynamicStyle"
    :disabled="isDisabled"
    :show-alpha="(widgetData.props?.showAlpha as boolean) || false"
    :color-format="(widgetData.props?.colorFormat as string) || undefined"
    :predefine="(widgetData.props?.predefine as string[]) || undefined"
  />
</template>
