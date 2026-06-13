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
  color: widgetStyle.value?.color as string,
}))

const inputRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  inputRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>

<template>
  <t-input
    ref="inputRef"
    v-model="widgetData.defaultValue as string"
    :style="dynamicStyle"
    type="textarea"
    :placeholder="(widgetData.props?.placeholder as string) || '请输入'"
    :disabled="isDisabled"
    :readonly="(widgetData.props?.readonly as boolean) || false"
    :rows="(widgetData.props?.rows as number) ?? 3"
    :maxlength="(widgetData.props?.maxlength as number) || undefined"
    :show-word-limit="(widgetData.props?.showWordLimit as boolean) || false"
    @change="forwardNativeChange"
    @input="forwardNativeChange"
  />
</template>

<style scoped>
:deep(.el-textarea__inner) {
  height: 100%;
}
</style>
