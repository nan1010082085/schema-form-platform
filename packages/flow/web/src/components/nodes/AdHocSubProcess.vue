<template>
  <div :class="[styles.node, { [styles.selected]: props.selected }]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <svg :class="styles.icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-dasharray="4 2" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
    <span :class="styles.label">{{ props.data?.label ?? '临时子流程' }}</span>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import styles from './AdHocSubProcess.module.scss'

const props = defineProps<{
  id: string
  data?: { label?: string; [key: string]: unknown }
  selected?: boolean
}>()
</script>
