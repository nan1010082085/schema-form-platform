<template>
  <div :class="[styles.node, { [styles.selected]: selected }]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <span :class="styles.label">{{ data?.label ?? '结束' }}</span>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import styles from './EndNode.module.scss'

export interface EndNodeData {
  label?: string
  [key: string]: unknown
}

defineProps<{
  id: string
  data?: EndNodeData
  selected?: boolean
}>()
</script>
