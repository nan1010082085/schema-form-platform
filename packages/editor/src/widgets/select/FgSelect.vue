<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useDynamicOptions } from '../../composables/useDynamicOptions'
import { useExposeWidget } from '../../composables/useExposeWidget'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))

// 动态选项加载（api 配置存在时生效）
const { options: dynamicOptions, loading } = useDynamicOptions(
  computed(() => widgetData.value.api),
)

// 合并：动态选项优先，降级到静态 options
const resolvedOptions = computed(() =>
  dynamicOptions.value.length ? dynamicOptions.value : (widgetData.value.options ?? []),
)

const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))

const selectRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  selectRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>

<template>
  <t-select
    ref="selectRef"
    v-model="widgetData.defaultValue"
    :style="dynamicStyle"
    :placeholder="(widgetData.props?.placeholder as string) || '请选择'"
    :disabled="isDisabled"
    :clearable="(widgetData.props?.clearable as boolean) ?? true"
    :multiple="(widgetData.props?.multiple as boolean) || false"
    :filterable="(widgetData.props?.filterable as boolean) || false"
    :loading="loading"
    @change="forwardNativeChange"
  >
    <t-option
      v-for="opt in resolvedOptions"
      :key="opt.value"
      :label="opt.label"
      :value="opt.value"
    />
  </t-select>
</template>

<style scoped>
:deep(.el-select__wrapper) {
  height: 100%;
}
</style>
