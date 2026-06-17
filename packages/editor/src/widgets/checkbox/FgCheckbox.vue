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
const { options: dynamicOptions } = useDynamicOptions(
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

const groupRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  groupRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>

<template>
  <el-checkbox-group
    ref="groupRef"
    v-model="widgetData.defaultValue"
    :style="dynamicStyle"
    :disabled="isDisabled"
    @change="forwardNativeChange"
  >
    <el-checkbox
      v-for="opt in resolvedOptions"
      :key="opt.value"
      :label="opt.value"
    >
      {{ opt.label }}
    </el-checkbox>
  </el-checkbox-group>
</template>
