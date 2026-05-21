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
  <el-checkbox-group
    v-model="widgetData.defaultValue"
    :style="dynamicStyle"
    :disabled="isDisabled"
  >
    <el-checkbox
      v-for="opt in (widgetData.options || [])"
      :key="opt.value"
      :value="opt.value"
    >
      {{ opt.label }}
    </el-checkbox>
  </el-checkbox-group>
</template>

<style scoped>
:deep(.el-checkbox-group) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
</style>
