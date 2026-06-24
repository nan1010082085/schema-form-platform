<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import './style.module.scss'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useDynamicOptions } from '../../composables/useDynamicOptions'
import { useExposeWidget } from '../../composables/useExposeWidget'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

// 暴露 value 给联动系统
useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))

// 动态选项加载（api 配置存在时生效，支持 childrenKey 树形结构）
const { options: dynamicOptions, loading } = useDynamicOptions(
  computed(() => widgetData.value.api),
)

// 合并：动态选项优先，降级到静态 options
const resolvedData = computed(() =>
  dynamicOptions.value.length ? dynamicOptions.value : (widgetData.value.options ?? []),
)

// el-tree-select 的 props 映射（DictItem 结构天然匹配）
const treeProps = computed(() => ({
  label: 'label',
  value: 'value',
  children: 'children',
}))

const dynamicStyle = computed(() => ({
  width: '100%',
  height: `${widgetData.value.position?.h ?? 32}px`,
  '--el-component-size': `${widgetData.value.position?.h ?? 32}px`,
  '--el-component-size-small': `${widgetData.value.position?.h ?? 32}px`,
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))

const treeSelectRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  treeSelectRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>

<template>
  <el-tree-select
    ref="treeSelectRef"
    v-model="widgetData.defaultValue"
    class="fg-tree-select"
    :style="dynamicStyle"
    :data="resolvedData"
    :props="treeProps"
    :placeholder="(widgetData.props?.placeholder as string) || '请选择'"
    :disabled="isDisabled"
    :clearable="(widgetData.props?.clearable as boolean) ?? true"
    :multiple="(widgetData.props?.multiple as boolean) || false"
    :check-strictly="(widgetData.props?.checkStrictly as boolean) ?? true"
    :show-checkbox="(widgetData.props?.showCheckbox as boolean) || false"
    :loading="loading"
    @change="forwardNativeChange"
  />
</template>
