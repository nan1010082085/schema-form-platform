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

const autocompleteRef = ref<{ $el?: HTMLElement }>()

function forwardNativeChange() {
  autocompleteRef.value?.$el?.dispatchEvent(new Event('change', { bubbles: true }))
}

const suggestions = computed(() =>
  (widgetData.value.props?.suggestions as { value: string }[]) || []
)
</script>

<template>
  <t-auto-complete
    ref="autocompleteRef"
    v-model="widgetData.defaultValue as string"
    :style="dynamicStyle"
    :placeholder="(widgetData.props?.placeholder as string) || '请输入'"
    :disabled="isDisabled"
    :clearable="(widgetData.props?.clearable as boolean) ?? true"
    :options="suggestions"
    @change="forwardNativeChange"
  />
</template>
