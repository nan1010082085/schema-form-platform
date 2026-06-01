<script setup lang="ts">
/**
 * MicroApp - 宿主侧子应用容器组件
 *
 * 封装 micro-app 自定义元素的通用配置：
 * - data 默认为空对象，避免子应用收到 undefined
 * - iframe 模式默认开启
 * - 默认铺满父容器
 *
 * @example
 * ```vue
 * <script setup>
 * import { MicroApp } from '@schema-form/micro-app'
 * import { getAppUrl } from '@schema-form/micro-app/config'
 *
 * const url = getAppUrl('editor', import.meta.env.DEV)
 * </script>
 *
 * <template>
 *   <MicroApp name="editor" :url="url" />
 * </template>
 * ```
 */
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
