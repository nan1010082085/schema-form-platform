<script setup lang="ts">
/**
 * EditorNode — Editor 节点（表单操作）
 *
 * 点击"编辑"按钮跳转到 Editor 编辑器进行细化编辑
 */
import { Handle, Position } from '@vue-flow/core'
import { useRouter } from 'vue-router'
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

const props = defineProps<Props>()
const router = useRouter()

function openEditor(): void {
  if (props.data.config.schemaId) {
    // 跳转到 Editor 编辑器，编辑对应的 Schema
    router.push(`/editor?id=${props.data.config.schemaId}`)
  } else {
    // 跳转到 Editor 创建新表单
    router.push('/instances')
  }
}
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
    <div :class="styles.nodeActions">
      <button :class="styles.actionBtn" @click.stop="openEditor" title="打开编辑器">
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
