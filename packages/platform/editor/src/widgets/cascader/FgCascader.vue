<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import './FgCascader.module.scss'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))

const dynamicStyle = computed(() => ({
  width: '100%',
  height: `${widgetData.value.position?.h ?? 32}px`,
  '--el-component-size': `${widgetData.value.position?.h ?? 32}px`,
  '--el-component-size-small': `${widgetData.value.position?.h ?? 32}px`,
  fontSize: widgetStyle.value?.fontSize as string,
}))

const cascaderProps = computed(() => ({
  multiple: (widgetData.value.props?.multiple as boolean) || false,
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
    :check-strictly="(widgetData.props?.checkStrictly as boolean) || false"
    :props="cascaderProps"
    @change="forwardNativeChange"
  />
</template>

