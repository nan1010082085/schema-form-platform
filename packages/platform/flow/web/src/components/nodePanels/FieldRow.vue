<script setup lang="ts">
import styles from './FieldRow.module.scss'

defineProps<{
  label: string
  textarea?: boolean
}>()
</script>

<template>
  <div :class="[styles['field-row'], textarea && styles['field-row--textarea']]">
    <div :class="styles['field-row__label']">{{ label }}</div>
    <div :class="[styles['field-row__control'], textarea && styles['field-row__control--textarea']]">
      <slot />
    </div>
  </div>
</template>
