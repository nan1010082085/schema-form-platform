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

function fetchSuggestions(queryString: string, cb: (results: { value: string }[]) => void) {
  const suggestions = (widgetData.value.props?.suggestions as { value: string }[]) || []
  const results = queryString
    ? suggestions.filter(s => s.value.toLowerCase().includes(queryString.toLowerCase()))
    : suggestions
  cb(results)
}
</script>

<template>
  <el-autocomplete
    ref="autocompleteRef"
    v-model="widgetData.defaultValue as string"
    :style="dynamicStyle"
    :placeholder="(widgetData.props?.placeholder as string) || '请输入'"
    :disabled="isDisabled"
    :clearable="(widgetData.props?.clearable as boolean) ?? true"
    :debounce="(widgetData.props?.debounce as number) ?? 300"
    :fetch-suggestions="fetchSuggestions"
    @change="forwardNativeChange"
  />
</template>
