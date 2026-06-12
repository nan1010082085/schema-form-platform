/**
 * Task Chain 状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TaskChainStep } from '@/types'

export const useTaskStore = defineStore('ai-task', () => {
  const taskChain = ref<TaskChainStep[]>([])
  const taskChainIndex = ref(0)

  function setTaskChain(steps: TaskChainStep[]) {
    taskChain.value = steps
    taskChainIndex.value = 0
  }

  function setCurrentTaskIndex(index: number) {
    taskChainIndex.value = index
  }

  function addTaskStep(step: TaskChainStep) {
    taskChain.value.push(step)
  }

  function updateTaskStep(index: number, updates: Partial<TaskChainStep>) {
    if (taskChain.value[index]) {
      taskChain.value[index] = { ...taskChain.value[index], ...updates }
    }
  }

  function clearTaskChain() {
    taskChain.value = []
    taskChainIndex.value = 0
  }

  return {
    taskChain,
    taskChainIndex,
    setTaskChain,
    setCurrentTaskIndex,
    addTaskStep,
    updateTaskStep,
    clearTaskChain,
  }
})
