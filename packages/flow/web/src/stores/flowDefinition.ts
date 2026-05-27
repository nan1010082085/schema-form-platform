import { defineStore } from 'pinia'
import { ref } from 'vue'
import { flowApi } from '../api/flowApi.js'

export interface FlowDefinition {
  id: string
  name: string
  description: string
  category: string
  status: 'draft' | 'published' | 'archived'
  currentVersionId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const useFlowDefinitionStore = defineStore('flowDefinition', () => {
  const definitions = ref<FlowDefinition[]>([])
  const currentDefinition = ref<FlowDefinition | null>(null)
  const loading = ref(false)

  async function fetchDefinitions(params?: { search?: string; status?: string; page?: number }) {
    loading.value = true
    try {
      const data = await flowApi.listFlows(params) as { items: FlowDefinition[] }
      definitions.value = data.items
    } finally {
      loading.value = false
    }
  }

  async function fetchDefinition(id: string) {
    loading.value = true
    try {
      currentDefinition.value = (await flowApi.getFlow(id)) as FlowDefinition
    } finally {
      loading.value = false
    }
  }

  async function createDefinition(data: { name: string; description?: string; category?: string }) {
    const def = (await flowApi.createFlow(data)) as FlowDefinition
    definitions.value.unshift(def)
    return def
  }

  async function deleteDefinition(id: string) {
    await flowApi.deleteFlow(id)
    definitions.value = definitions.value.filter((d) => d.id !== id)
    if (currentDefinition.value?.id === id) currentDefinition.value = null
  }

  async function publishDefinition(id: string) {
    const def = (await flowApi.publishFlow(id)) as FlowDefinition
    const idx = definitions.value.findIndex((d) => d.id === id)
    if (idx !== -1) definitions.value[idx] = def
    if (currentDefinition.value?.id === id) currentDefinition.value = def
  }

  return {
    definitions,
    currentDefinition,
    loading,
    fetchDefinitions,
    fetchDefinition,
    createDefinition,
    deleteDefinition,
    publishDefinition,
  }
})
