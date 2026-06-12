/**
 * Flow 状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FlowGraph, FlowDiff } from '@/types'

export const useFlowStore = defineStore('ai-flow', () => {
  const currentFlow = ref<FlowGraph | null>(null)
  const currentFlowDiff = ref<FlowDiff | null>(null)

  const hasFlowPreview = computed(() => currentFlow.value !== null)

  function setCurrentFlow(flow: FlowGraph | null) {
    currentFlow.value = flow
  }

  function setFlowDiff(diff: FlowDiff | null) {
    currentFlowDiff.value = diff
  }

  function clearFlow() {
    currentFlow.value = null
    currentFlowDiff.value = null
  }

  return {
    currentFlow,
    currentFlowDiff,
    hasFlowPreview,
    setCurrentFlow,
    setFlowDiff,
    clearFlow,
  }
})
