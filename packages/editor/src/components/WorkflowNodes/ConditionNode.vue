<script setup lang="ts">
/**
 * ConditionNode — 条件节点
 */
import { Handle, Position } from '@vue-flow/core'
import styles from './WorkflowNode.module.scss'

interface Props {
  data: {
    label: string
    nodeType: string
    config: {
      field?: string
      operator?: string
      value?: string
      [key: string]: unknown
    }
    description?: string
  }
  selected?: boolean
}

defineProps<Props>()
</script>

<template>
  <div :class="[styles.node, styles.conditionNode, selected && styles.selected]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <div :class="styles.nodeHeader">
      <div :class="styles.nodeIcon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 3h5v5"/>
          <path d="M8 3H3v5"/>
          <path d="M12 22v-6"/>
          <path d="M21 3l-9 9"/>
          <path d="M3 3l9 9"/>
        </svg>
      </div>
      <span :class="styles.nodeLabel">{{ data.label }}</span>
    </div>
    <div :class="styles.conditionBranches">
      <div :class="styles.branch">
        <span :class="styles.branchLabel">是</span>
        <Handle
          id="true"
          type="source"
          :position="Position.Bottom"
          :style="{ left: '30%' }"
          :class="[styles.handle, styles.handleTrue]"
        />
      </div>
      <div :class="styles.branch">
        <span :class="styles.branchLabel">否</span>
        <Handle
          id="false"
          type="source"
          :position="Position.Bottom"
          :style="{ left: '70%' }"
          :class="[styles.handle, styles.handleFalse]"
        />
      </div>
    </div>
  </div>
</template>
