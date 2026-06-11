<template>
  <WorkflowNodeBase
    :id="id"
    :name="data?.name ?? 'AI 任务'"
    accent="ai"
    :status="data?.status"
    :selected="selected"
  >
    <template #icon>
      <svg :class="styles.icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </template>
    <div :class="styles.summary">
      <span :class="styles.modelName">{{ data?.modelName ?? '未选择模型' }}</span>
      <span v-if="data?.outputVar" :class="styles.outputVar">{{ data.outputVar }}</span>
    </div>
  </WorkflowNodeBase>
</template>

<script setup lang="ts">
import WorkflowNodeBase from './WorkflowNodeBase.vue'
import styles from './AINode.module.scss'

export interface AINodeData {
  name?: string
  modelName?: string
  outputVar?: string
  prompt?: string
  status?: 'idle' | 'running' | 'success' | 'error'
  [key: string]: unknown
}

defineProps<{
  id: string
  data?: AINodeData
  selected?: boolean
}>()
</script>
