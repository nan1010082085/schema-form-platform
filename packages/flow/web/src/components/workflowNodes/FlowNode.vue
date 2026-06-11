<template>
  <WorkflowNodeBase
    :id="id"
    :name="data?.name ?? '子流程'"
    accent="flow"
    :status="data?.status"
    :selected="selected"
  >
    <template #icon>
      <svg :class="styles.icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </template>
    <div :class="styles.summary">
      <span>{{ data?.flowName ?? '未配置' }}</span>
      <span v-if="nodeCount !== null" :class="styles.badge">{{ nodeCount }} 个节点</span>
    </div>
  </WorkflowNodeBase>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WorkflowNodeBase from './WorkflowNodeBase.vue'
import styles from './FlowNode.module.scss'

export interface FlowNodeData {
  name?: string
  flowName?: string
  nodeCount?: number
  status?: 'idle' | 'running' | 'success' | 'error'
  flowId?: string
  [key: string]: unknown
}

const props = defineProps<{
  id: string
  data?: FlowNodeData
  selected?: boolean
}>()

const nodeCount = computed(() => props.data?.nodeCount ?? null)
</script>
