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

const cascaderRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  cascaderRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>

<template>
  <el-cascader
    ref="cascaderRef"
    v-model="widgetData.defaultValue"
    :style="dynamicStyle"
    :options="(widgetData.props?.options as any[]) || []"
    :placeholder="(widgetData.props?.placeholder as string) || '请选择'"
    :disabled="isDisabled"
    :clearable="(widgetData.props?.clearable as boolean) ?? true"
    :show-all-levels="(widgetData.props?.showAllLevels as boolean) ?? true"
    :collapse-tags="(widgetData.props?.collapseTags as boolean) || false"
    :multiple="(widgetData.props?.multiple as boolean) || false"
    :check-strictly="(widgetData.props?.checkStrictly as boolean) || false"
    @change="forwardNativeChange"
  />
</template>

<style scoped>
:deep(.el-cascader) {
  width: 100%;
}
</style>
