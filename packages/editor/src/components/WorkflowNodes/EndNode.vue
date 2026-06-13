<script setup lang="ts">
/**
 * EndNode — 工作流结束节点
 */
import { Handle, Position } from '@vue-flow/core'
import styles from './WorkflowNode.module.scss'

interface Props {
  data: {
    label: string
    nodeType: string
    config: Record<string, unknown>
    description?: string
  }
  selected?: boolean
}

defineProps<Props>()
</script>

<template>
  <div :class="[styles.node, styles.endNode, selected && styles.selected]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <div :class="styles.nodeHeader">
      <div :class="styles.nodeIcon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
      </div>
      <span :class="styles.nodeLabel">{{ data.label }}</span>
    </div>
  </div>
</template>
