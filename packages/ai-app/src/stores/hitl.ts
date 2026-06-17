/**
 * HITL (Human-in-the-Loop) 管理 Store
 *
 * 职责：中断确认、人工干预管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PendingInterrupt } from '@/types'

export const useHITLStore = defineStore('hitl', () => {
  // ---- State ----
  const pendingInterrupt = ref<PendingInterrupt | null>(null)

  // ---- Actions ----
  function setInterrupt(interrupt: PendingInterrupt): void {
    pendingInterrupt.value = interrupt
  }

  function clearInterrupt(): void {
    pendingInterrupt.value = null
  }

  return {
    // state
    pendingInterrupt,
    // actions
    setInterrupt,
    clearInterrupt,
  }
})
