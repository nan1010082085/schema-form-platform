<script setup lang="ts">
import styles from './FieldRow.module.scss'
import HintText from './HintText.vue'

defineProps<{
  label: string
  textarea?: boolean
  /** label 右侧的提示信息（hover 显示） */
  hint?: string
}>()
</script>

<template>
  <div :class="[styles['field-row'], textarea && styles['field-row--textarea']]">
    <div :class="styles['field-row__label']">
      {{ label }}
      <HintText v-if="hint">{{ hint }}</HintText>
    </div>
    <div :class="[styles['field-row__control'], textarea && styles['field-row__control--textarea']]">
      <slot />
    </div>
  </div>
</template>
