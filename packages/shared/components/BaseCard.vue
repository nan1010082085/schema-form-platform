<script setup lang="ts">
/**
 * BaseCard — 统一卡片组件
 *
 * 支持标题、副标题、操作区
 * 支持阴影和边框
 */

import { computed } from 'vue'
import styles from './BaseCard.module.css'

const props = withDefaults(defineProps<{
  /** 标题 */
  title?: string
  /** 副标题 */
  subtitle?: string
  /** 是否显示阴影 */
  shadow?: boolean | 'hover'
  /** 是否显示边框 */
  bordered?: boolean
  /** 是否无内边距 */
  noPadding?: boolean
}>(), {
  shadow: false,
  bordered: true,
  noPadding: false,
})

const classes = computed(() => [
  styles.card,
  props.shadow === true ? styles['card--shadow'] : '',
  props.shadow === 'hover' ? styles['card--shadow-hover'] : '',
  !props.bordered ? styles['card--borderless'] : '',
].filter(Boolean))

const hasHeader = computed(() =>
  props.title || props.subtitle || !!slots.actions
)

const slots = defineSlots<{
  /** 卡片头部操作区 */
  actions?: () => any
  /** 默认内容 */
  default?: () => any
  /** 底部区域 */
  footer?: () => any
}>()
</script>

<template>
  <div :class="classes">
    <div v-if="hasHeader" :class="styles.header">
      <div :class="styles.headerText">
        <div v-if="title" :class="styles.title">{{ title }}</div>
        <div v-if="subtitle" :class="styles.subtitle">{{ subtitle }}</div>
      </div>
      <div v-if="$slots.actions" :class="styles.actions">
        <slot name="actions" />
      </div>
    </div>
    <div :class="[styles.body, noPadding ? styles['body--no-padding'] : '']">
      <slot />
    </div>
    <div v-if="$slots.footer" :class="styles.footer">
      <slot name="footer" />
    </div>
  </div>
</template>
