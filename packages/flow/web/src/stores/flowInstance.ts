import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  FlowInstanceQuery,
  FlowInstanceData,
  TaskInstanceData,
  RejectTargetNode,
} from '@schema-form/flow-shared'
import { flowApi } from '../api/flowApi.js'

export type FlowInstance = FlowInstanceData & { definitionName?: string | null }
export type TaskInstance = TaskInstanceData

export const useFlowInstanceStore = defineStore('flowInstance', () => {
  const instances = ref<FlowInstance[]>([])
  const total = ref(0)
  const currentInstance = ref<FlowInstance | null>(null)
  const tasks = ref<TaskInstance[]>([])
  const loading = ref(false)

  async function fetchInstances(params?: FlowInstanceQuery) {
    loading.value = true
    try {
      const data = await flowApi.listInstances(params)
      instances.value = data.items
      total.value = data.total
    } finally {
      loading.value = false
    }
  }

  async function startInstance(definitionId: string, variables?: Record<string, unknown>) {
    const instance = await flowApi.startInstance({ definitionId, variables })
    instances.value.unshift(instance)
    return instance
  }

  async function fetchInstanceDetail(id: string) {
    loading.value = true
    try {
      currentInstance.value = await flowApi.getInstance(id)
    } finally {
      loading.value = false
    }
  }

  async function terminateInstance(id: string) {
    const instance = await flowApi.terminateInstance(id)
    const idx = instances.value.findIndex((i) => i.id === id)
    if (idx !== -1) instances.value[idx] = instance
    if (currentInstance.value?.id === id) currentInstance.value = instance
  }

  async function suspendInstance(id: string) {
    const instance = await flowApi.suspendInstance(id)
    const idx = instances.value.findIndex((i) => i.id === id)
    if (idx !== -1) instances.value[idx] = instance
    if (currentInstance.value?.id === id) currentInstance.value = instance
  }

  async function resumeInstance(id: string) {
    const instance = await flowApi.resumeInstance(id)
    const idx = instances.value.findIndex((i) => i.id === id)
    if (idx !== -1) instances.value[idx] = instance
    if (currentInstance.value?.id === id) currentInstance.value = instance
  }

  async function fetchMyTasks() {
    loading.value = true
    try {
      const data = await flowApi.getMyTasks()
      tasks.value = data.items
    } finally {
      loading.value = false
    }
  }

  async function claimTask(taskId: string) {
    const task = await flowApi.claimTask(taskId)
    const idx = tasks.value.findIndex((t) => t.id === taskId)
    if (idx !== -1) tasks.value[idx] = task
    return task
  }

  async function completeTask(taskId: string, formData?: Record<string, unknown>, outcome?: string) {
    const task = await flowApi.completeTask(taskId, { formData, outcome })
    const idx = tasks.value.findIndex((t) => t.id === taskId)
    if (idx !== -1) tasks.value[idx] = task
    return task
  }

  async function getRejectTargets(taskId: string): Promise<RejectTargetNode[]> {
    return flowApi.getRejectTargets(taskId)
  }

  async function rejectToNode(taskId: string, targetNodeId: string, comment?: string) {
    const task = await flowApi.rejectToNode(taskId, { targetNodeId, comment })
    const idx = tasks.value.findIndex((t) => t.id === taskId)
    if (idx !== -1) tasks.value[idx] = task
    return task
  }

  return {
    instances,
    total,
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
    getRejectTargets,
    rejectToNode,
  }
})
