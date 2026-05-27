<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { EVENT_CONTEXT_KEY } from '../../components/WidgetRenderer/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { triggerWidgetEvent } from '../../engine/eventEngine'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()
const eventCtx = inject(EVENT_CONTEXT_KEY, null)

const dynamicStyle = computed(() => {
  const s: Record<string, string> = {}
  if (widgetStyle.value?.fontSize) s.fontSize = widgetStyle.value.fontSize as string
  if (widgetStyle.value?.color) s.color = widgetStyle.value.color as string
  if (widgetStyle.value?.backgroundColor) s.backgroundColor = widgetStyle.value.backgroundColor as string
  if (widgetStyle.value?.borderRadius) s.borderRadius = widgetStyle.value.borderRadius as string
  if (widgetStyle.value?.border) s.border = widgetStyle.value.border as string
  return s
})

const buttonType = computed(() => (widgetData.value.props?.type as string) || 'default')
const buttonSize = computed(() => (widgetData.value.props?.size as string) || 'default')
const isPlain = computed(() => Boolean(widgetData.value.props?.plain))
const isRound = computed(() => Boolean(widgetData.value.props?.round))
const isCircle = computed(() => Boolean(widgetData.value.props?.circle))
const buttonText = computed(() => widgetData.value.label || widgetData.value.props?.text || '按钮')

async function handleClick() {
  if (eventCtx) {
    await triggerWidgetEvent(widgetData.value, 'click', eventCtx)
  }
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
