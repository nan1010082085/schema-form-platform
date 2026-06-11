<template>
  <div :class="[styles.node, { [styles.selected]: selected }]">
    <span :class="styles.label">{{ data?.label ?? '开始' }}</span>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import styles from './StartNode.module.scss'

export interface StartNodeData {
  label?: string
  [key: string]: unknown
}

defineProps<{
  id: string
  data?: StartNodeData
  selected?: boolean
}>()
</script>
