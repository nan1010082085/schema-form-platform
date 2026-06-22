import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FlowTemplateData, FlowTemplateQuery } from '@schema-form/flow-shared'
import { flowApi } from '../api/flowApi.js'

export type FlowTemplate = FlowTemplateData

export const useFlowTemplateStore = defineStore('flowTemplate', () => {
  const templates = ref<FlowTemplate[]>([])
  const currentTemplate = ref<FlowTemplate | null>(null)
  const total = ref(0)
  const loading = ref(false)

  async function fetchTemplates(query?: FlowTemplateQuery) {
    loading.value = true
    try {
      const data = await flowApi.listTemplates(query)
      templates.value = data.items
      total.value = data.total
    } finally {
      loading.value = false
    }
  }

  async function fetchTemplate(id: string) {
    loading.value = true
    try {
      currentTemplate.value = await flowApi.getTemplate(id)
    } finally {
      loading.value = false
    }
  }

  async function deleteTemplate(id: string) {
    await flowApi.deleteTemplate(id)
    templates.value = templates.value.filter((t) => t.id !== id)
    if (currentTemplate.value?.id === id) currentTemplate.value = null
  }

  async function applyTemplate(id: string, data?: { name?: string; description?: string }) {
    return await flowApi.applyTemplate(id, data)
  }

  async function seedBuiltinTemplates() {
    return await flowApi.seedBuiltinTemplates()
  }

  async function saveAsTemplate(definitionId: string, data?: { name?: string; description?: string; category?: string; tags?: string[]; thumbnail?: string }) {
    const template = await flowApi.saveAsTemplate(definitionId, data)
    templates.value.unshift(template)
    return template
  }

  return {
    templates,
    currentTemplate,
    total,
    loading,
    fetchTemplates,
    fetchTemplate,
    deleteTemplate,
    applyTemplate,
    seedBuiltinTemplates,
    saveAsTemplate,
  }
})
