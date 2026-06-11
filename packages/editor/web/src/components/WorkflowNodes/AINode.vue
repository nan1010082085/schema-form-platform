<script setup lang="ts">
/**
 * AINode — AI 节点
 */
import { Handle, Position } from '@vue-flow/core'
import styles from './WorkflowNode.module.scss'

interface Props {
  data: {
    label: string
    nodeType: string
    config: {
      prompt?: string
      model?: string
      temperature?: number
      [key: string]: unknown
    }
    description?: string
  }
  selected?: boolean
}

defineProps<Props>()
</script>

<template>
  <div :class="[styles.node, styles.aiNode, selected && styles.selected]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <div :class="styles.nodeHeader">
      <div :class="styles.nodeIcon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22"/>
          <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93"/>
          <circle cx="12" cy="6" r="1"/>
        </svg>
      </div>
      <span :class="styles.nodeLabel">{{ data.label }}</span>
    </div>
    <div :class="styles.nodeContent">
      <span v-if="data.config.model" :class="styles.nodeTag">{{ data.config.model }}</span>
    </div>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
  </div>
</template>
