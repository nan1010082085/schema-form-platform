<script setup lang="ts">
/**
 * EditorNode — Editor 节点（表单操作）
 */
import { Handle, Position } from '@vue-flow/core'
import styles from './WorkflowNode.module.scss'

interface Props {
  data: {
    label: string
    nodeType: string
    config: {
      schemaId?: string
      fields?: string[]
      [key: string]: unknown
    }
    description?: string
  }
  selected?: boolean
}

defineProps<Props>()
</script>

<template>
  <div :class="[styles.node, styles.editorNode, selected && styles.selected]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <div :class="styles.nodeHeader">
      <div :class="styles.nodeIcon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </div>
      <span :class="styles.nodeLabel">{{ data.label }}</span>
    </div>
    <div v-if="data.config.schemaId" :class="styles.nodeContent">
      <span :class="styles.nodeHint">表单: {{ data.config.schemaId }}</span>
    </div>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
  </div>
</template>
