<script setup lang="ts">
/**
 * FlowNode — Flow 节点（流程操作）
 */
import { Handle, Position } from '@vue-flow/core'
import styles from './WorkflowNode.module.scss'

interface Props {
  data: {
    label: string
    nodeType: string
    config: {
      flowId?: string
      triggerType?: string
      [key: string]: unknown
    }
    description?: string
  }
  selected?: boolean
}

defineProps<Props>()
</script>

<template>
  <div :class="[styles.node, styles.flowNode, selected && styles.selected]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <div :class="styles.nodeHeader">
      <div :class="styles.nodeIcon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      </div>
      <span :class="styles.nodeLabel">{{ data.label }}</span>
    </div>
    <div v-if="data.config.flowId" :class="styles.nodeContent">
      <span :class="styles.nodeHint">流程: {{ data.config.flowId }}</span>
    </div>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
  </div>
</template>
