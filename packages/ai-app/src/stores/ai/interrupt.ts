/**
 * HITL Interrupt 状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PendingInterrupt } from '@/types'

export const useInterruptStore = defineStore('ai-interrupt', () => {
  const pendingInterrupt = ref<PendingInterrupt | null>(null)

  function setPendingInterrupt(interrupt: PendingInterrupt | null) {
    pendingInterrupt.value = interrupt
  }

  function clearPendingInterrupt() {
    pendingInterrupt.value = null
  }

  return {
    pendingInterrupt,
    setPendingInterrupt,
    clearPendingInterrupt,
  }
})
