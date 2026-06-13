<script setup lang="ts">
/**
 * BaseButton — 统一按钮组件
 *
 * 支持类型：primary / secondary / danger / text
 * 支持尺寸：small / medium / large
 * 支持状态：loading / disabled
 */

import { computed } from 'vue'
import { LoadingIcon } from 'tdesign-icons-vue-next'
import styles from './BaseButton.module.css'

const props = withDefaults(defineProps<{
  /** 按钮类型 */
  type?: 'primary' | 'secondary' | 'danger' | 'text'
  /** 按钮尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 是否禁用 */
  disabled?: boolean
  /** 是否加载中 */
  loading?: boolean
  /** 原生 type 属性 */
  nativeType?: 'button' | 'submit' | 'reset'
  /** 图标插槽位置 */
  iconPosition?: 'left' | 'right'
}>(), {
  type: 'secondary',
  size: 'medium',
  disabled: false,
  loading: false,
  nativeType: 'button',
  iconPosition: 'left',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const classes = computed(() => [
  styles.button,
  styles[`button--${props.type}`],
  styles[`button--${props.size}`],
  props.disabled ? styles['is-disabled'] : '',
  props.loading ? styles['is-loading'] : '',
].filter(Boolean))

function handleClick(event: MouseEvent) {
  if (props.disabled || props.loading) return
  emit('click', event)
}
</script>

<template>
  <button
    :class="classes"
    :type="nativeType"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" :class="styles.spinner">
      <LoadingIcon />
    </span>
    <slot v-if="iconPosition === 'left' && !loading" name="icon" />
    <span v-if="$slots.default" :class="styles.content">
      <slot />
    </span>
    <slot v-if="iconPosition === 'right' && !loading" name="icon" />
  </button>
</template>
