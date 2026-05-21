<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))
</script>

<template>
  <el-input
    v-model="widgetData.defaultValue as string"
    :style="dynamicStyle"
    :placeholder="(widgetData.props?.placeholder as string) || '请输入'"
    :disabled="isDisabled"
    :readonly="(widgetData.props?.readonly as boolean) || false"
    :clearable="(widgetData.props?.clearable as boolean) ?? true"
    :maxlength="(widgetData.props?.maxlength as number) || undefined"
    :show-password="(widgetData.props?.showPassword as boolean) || false"
  />
</template>

<style scoped>
:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  height: 100%;
}
</style>
