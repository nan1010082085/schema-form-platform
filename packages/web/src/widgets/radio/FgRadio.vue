<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useDynamicOptions } from '../../composables/useDynamicOptions'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

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
</script>

<template>
  <el-radio-group
    v-model="widgetData.defaultValue"
    :style="dynamicStyle"
    :disabled="isDisabled"
  >
    <el-radio
      v-for="opt in resolvedOptions"
      :key="opt.value"
      :value="opt.value"
    >
      {{ opt.label }}
    </el-radio>
  </el-radio-group>
</template>

<style scoped>
:deep(.el-radio-group) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
</style>
