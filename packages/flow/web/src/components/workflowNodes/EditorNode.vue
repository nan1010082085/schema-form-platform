<template>
  <WorkflowNodeBase
    :id="id"
    :name="data?.name ?? '表单配置'"
    accent="editor"
    :status="data?.status"
    :selected="selected"
  >
    <template #icon>
      <svg :class="styles.icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    </template>
    <div :class="styles.summary">
      <span>{{ data?.schemaName ?? '未配置' }}</span>
      <span v-if="fieldCount !== null" :class="styles.badge">{{ fieldCount }} 个字段</span>
    </div>
  </WorkflowNodeBase>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WorkflowNodeBase from './WorkflowNodeBase.vue'
import styles from './EditorNode.module.scss'

export interface EditorNodeData {
  name?: string
  schemaName?: string
  fieldCount?: number
  status?: 'idle' | 'running' | 'success' | 'error'
  schemaId?: string
  [key: string]: unknown
}

const props = defineProps<{
  id: string
  data?: EditorNodeData
  selected?: boolean
}>()

const fieldCount = computed(() => props.data?.fieldCount ?? null)
</script>
