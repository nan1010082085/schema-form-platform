<script setup lang="ts">
import { computed, type StyleValue } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  url: string
  data?: Record<string, unknown>
  iframe?: boolean
  style?: StyleValue
  class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>
}>(), {
  data: () => ({}),
  iframe: true,
})

const mergedStyle = computed<StyleValue>(() => ({
  width: '100%',
  height: '100%',
  border: 'none',
  display: 'block',
  contain: 'layout style',
  ...(props.style as Record<string, string> ?? {}),
}))
</script>

<template>
  <micro-app
    :name="props.name"
    :url="props.url"
    :data="props.data"
    :iframe="props.iframe"
    :style="mergedStyle"
    :class="props.class"
  />
</template>
