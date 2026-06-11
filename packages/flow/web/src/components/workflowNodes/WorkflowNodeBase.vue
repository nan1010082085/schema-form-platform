<template>
  <div :class="[styles.node, accentClass, { [styles.selected]: selected }]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <div :class="styles.header">
      <slot name="icon" />
      <span :class="styles.name">{{ name }}</span>
      <span v-if="status" :class="[styles.status, statusClass]">{{ statusLabel }}</span>
    </div>
    <div :class="styles.body">
      <slot />
    </div>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import styles from './WorkflowNodeBase.module.scss'

export type NodeAccent = 'editor' | 'flow' | 'ai' | 'condition' | 'notify'

const props = defineProps<{
  id: string
  name: string
  accent: NodeAccent
  status?: 'idle' | 'running' | 'success' | 'error'
  selected?: boolean
}>()

const accentClass = computed(() => styles[`accent-${props.accent}`])

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    idle: '待执行',
    running: '执行中',
    success: '已完成',
    error: '异常',
  }
  return map[props.status ?? 'idle'] ?? ''
})

const statusClass = computed(() => {
  if (!props.status || props.status === 'idle') return ''
  return styles[`status-${props.status}`]
})
</script>
