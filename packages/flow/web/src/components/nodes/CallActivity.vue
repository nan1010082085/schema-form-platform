<template>
  <div :class="[styles.node, { [styles.selected]: props.selected }]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <svg :class="styles.icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
    <span :class="styles.label">{{ props.data?.label ?? '调用活动' }}</span>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import styles from './CallActivity.module.scss'

const props = defineProps<{
  id: string
  data?: { label?: string; [key: string]: unknown }
  selected?: boolean
}>()
</script>
