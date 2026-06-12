<template>
  <WorkflowNodeBase
    :id="id"
    :name="data?.name ?? 'Agent'"
    accent="ai"
    :status="data?.status"
    :selected="selected"
  >
    <template #icon>
      <svg :class="styles.icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
        <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z" />
        <circle cx="12" cy="6" r="1" fill="currentColor" />
      </svg>
    </template>
    <div :class="styles.summary">
      <span :class="styles.agentType">{{ agentTypeLabel }}</span>
      <span v-if="data?.model" :class="styles.model">{{ data.model }}</span>
    </div>
  </WorkflowNodeBase>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WorkflowNodeBase from './WorkflowNodeBase.vue'
import styles from './AgentNode.module.scss'

export interface AgentNodeData {
  name?: string
  agentType?: 'llm' | 'tool' | 'collaborator' | 'supervisor'
  model?: string
  systemPrompt?: string
  tools?: string[]
  status?: 'idle' | 'running' | 'success' | 'error'
  [key: string]: unknown
}

const props = defineProps<{
  id: string
  data?: AgentNodeData
  selected?: boolean
}>()

const agentTypeLabels: Record<string, string> = {
  llm: 'LLM Agent',
  tool: 'Tool Agent',
  collaborator: 'Collaborator',
  supervisor: 'Supervisor',
}

const agentTypeLabel = computed(() => {
  const type = props.data?.agentType || 'llm'
  return agentTypeLabels[type] || 'Agent'
})
</script>
