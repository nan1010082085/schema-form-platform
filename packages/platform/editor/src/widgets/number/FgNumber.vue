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

const widgetHeight = computed(() => widgetData.value.position?.h ?? 32)
const buttonHeight = computed(() => Math.floor(widgetHeight.value / 2))

const dynamicStyle = computed(() => ({
  width: '100%',
  height: `${widgetHeight.value}px`,
  '--el-component-size': `${widgetHeight.value}px`,
  '--el-component-size-small': `${widgetHeight.value}px`,
  '--number-btn-height': `${buttonHeight.value}px`,
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))

const numberRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  numberRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>

<template>
  <el-input-number
    ref="numberRef"
    v-model="widgetData.defaultValue as number"
    :style="dynamicStyle"
    :placeholder="(widgetData.props?.placeholder as string) || '请输入数字'"
    :disabled="isDisabled"
    :min="(widgetData.props?.min as number) || undefined"
    :max="(widgetData.props?.max as number) || undefined"
    :step="(widgetData.props?.step as number) ?? 1"
    :precision="(widgetData.props?.precision as number) || undefined"
    controls-position="right"
    @change="forwardNativeChange"
  />
</template>

<style scoped>
.el-input-number {
  width: 100%;
}

.el-input-number :deep(.el-input__wrapper) {
  min-height: inherit;
  height: inherit;
}

.el-input-number :deep(.el-input-number__increase),
.el-input-number :deep(.el-input-number__decrease) {
  height: var(--number-btn-height, 16px);
  line-height: var(--number-btn-height, 16px);
}
</style>
