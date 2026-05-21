<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { triggerWidgetEvent } from '../../engine/eventEngine'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
  backgroundColor: widgetStyle.value?.backgroundColor as string,
  borderRadius: widgetStyle.value?.borderRadius as string,
  border: widgetStyle.value?.border as string,
}))

const buttonType = computed(() => (widgetData.value.props?.type as string) || 'default')
const buttonSize = computed(() => (widgetData.value.props?.size as string) || 'default')
const isPlain = computed(() => Boolean(widgetData.value.props?.plain))
const isRound = computed(() => Boolean(widgetData.value.props?.round))
const isCircle = computed(() => Boolean(widgetData.value.props?.circle))
const buttonText = computed(() => widgetData.value.label || widgetData.value.props?.text || '按钮')

function handleClick() {
  triggerWidgetEvent(widgetData.value, 'click')
}
</script>

<template>
  <el-button
    :style="dynamicStyle"
    :type="buttonType as 'primary' | 'success' | 'warning' | 'danger' | 'info' | ''"
    :size="buttonSize as 'large' | 'default' | 'small'"
    :plain="isPlain"
    :round="isRound"
    :circle="isCircle"
    :disabled="isDisabled"
    @click="handleClick"
  >
    {{ buttonText }}
  </el-button>
</template>

<style scoped>
:deep(.el-button) {
  width: 100%;
  height: 100%;
}
</style>
