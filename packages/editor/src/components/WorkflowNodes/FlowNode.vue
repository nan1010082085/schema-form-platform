<script setup lang="ts">
/**
 * FlowNode — Flow 节点（流程操作）
 *
 * 点击"编辑"按钮跳转到 Flow 设计器进行细化编辑
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

const props = defineProps<Props>()

function openFlowDesigner(): void {
  const flowBase = import.meta.env.VITE_FLOW_URL || '/'
  if (props.data.config.flowId) {
    // 跳转到 Flow 设计器，编辑对应的流程
    window.open(`${flowBase}designer?id=${props.data.config.flowId}`, '_blank')
  } else {
    // 跳转到 Flow 列表页
    window.open(`${flowBase}list`, '_blank')
  }
}
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
    <div :class="styles.nodeActions">
      <button :class="styles.actionBtn" @click.stop="openFlowDesigner" title="打开流程设计器">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </button>
    </div>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
  </div>
</template>
