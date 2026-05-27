import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FlowInstanceQuery } from '@schema-form/flow-shared'
import { flowApi } from '../api/flowApi.js'

export interface FlowInstance {
  id: string
  definitionId: string
  versionId: string
  version: number
  status: string
  variables: Record<string, unknown>
  tokens: Array<{ tokenId: string; nodeId: string; state: string }>
  initiatedBy: string
  startedAt: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TaskInstance {
  id: string
  instanceId: string
  nodeId: string
  nodeName: string
  status: string
  assignee?: string
  formData?: Record<string, unknown>
  formSchemaId?: string
  outcome?: string
  priority: number
  createdAt: string
  updatedAt: string
}

export const useFlowInstanceStore = defineStore('flowInstance', () => {
  const instances = ref<FlowInstance[]>([])
  const currentInstance = ref<FlowInstance | null>(null)
  const tasks = ref<TaskInstance[]>([])
  const loading = ref(false)

  async function fetchInstances(params?: FlowInstanceQuery) {
    loading.value = true
    try {
      const data = await flowApi.listInstances(params) as { items: FlowInstance[] }
      instances.value = data.items
    } finally {
      loading.value = false
    }
  }

  async function startInstance(definitionId: string, variables?: Record<string, unknown>) {
    const instance = (await flowApi.startInstance({ definitionId, variables })) as FlowInstance
    instances.value.unshift(instance)
    return instance
  }

  async function fetchInstanceDetail(id: string) {
    loading.value = true
    try {
      currentInstance.value = (await flowApi.getInstance(id)) as FlowInstance
    } finally {
      loading.value = false
    }
  }

  async function terminateInstance(id: string) {
    const instance = (await flowApi.terminateInstance(id)) as FlowInstance
    const idx = instances.value.findIndex((i) => i.id === id)
    if (idx !== -1) instances.value[idx] = instance
    if (currentInstance.value?.id === id) currentInstance.value = instance
  }

  async function suspendInstance(id: string) {
    const instance = (await flowApi.suspendInstance(id)) as FlowInstance
    const idx = instances.value.findIndex((i) => i.id === id)
    if (idx !== -1) instances.value[idx] = instance
    if (currentInstance.value?.id === id) currentInstance.value = instance
  }

  async function resumeInstance(id: string) {
    const instance = (await flowApi.resumeInstance(id)) as FlowInstance
    const idx = instances.value.findIndex((i) => i.id === id)
    if (idx !== -1) instances.value[idx] = instance
    if (currentInstance.value?.id === id) currentInstance.value = instance
  }

  async function fetchMyTasks() {
    loading.value = true
    try {
      const data = await flowApi.getMyTasks() as { items: TaskInstance[] }
      tasks.value = data.items
    } finally {
      loading.value = false
    }
  }

  async function claimTask(taskId: string) {
    const task = (await flowApi.claimTask(taskId)) as TaskInstance
    const idx = tasks.value.findIndex((t) => t.id === taskId)
    if (idx !== -1) tasks.value[idx] = task
    return task
  }

  async function completeTask(taskId: string, formData?: Record<string, unknown>, outcome?: string) {
    const task = (await flowApi.completeTask(taskId, { formData, outcome })) as TaskInstance
    const idx = tasks.value.findIndex((t) => t.id === taskId)
    if (idx !== -1) tasks.value[idx] = task
    return task
  }

  return {
    instances,
    currentInstance,
    tasks,
    loading,
    fetchInstances,
    startInstance,
    fetchInstanceDetail,
    terminateInstance,
    suspendInstance,
    resumeInstance,
    fetchMyTasks,
    claimTask,
    completeTask,
  }
})
