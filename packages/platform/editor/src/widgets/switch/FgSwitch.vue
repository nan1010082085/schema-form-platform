<script setup lang="ts">
import { inject, computed, ref } from 'vue'
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

const switchRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  switchRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>

<template>
  <el-switch
    ref="switchRef"
    v-model="widgetData.defaultValue as boolean"
    :style="dynamicStyle"
    :disabled="isDisabled"
    :active-text="(widgetData.props?.activeText as string) || ''"
    :inactive-text="(widgetData.props?.inactiveText as string) || ''"
    :active-color="(widgetData.props?.activeColor as string) || undefined"
    :inactive-color="(widgetData.props?.inactiveColor as string) || undefined"
    :active-value="(widgetData.props?.activeValue as boolean | string | number) ?? true"
    :inactive-value="(widgetData.props?.inactiveValue as boolean | string | number) ?? false"
    @change="forwardNativeChange"
  />
</template>
