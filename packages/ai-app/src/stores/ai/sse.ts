/**
 * SSE 连接状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SSEConnectionStatus, MentionReference } from '@/types'

export const useSseStore = defineStore('ai-sse', () => {
  const sseStatus = ref<SSEConnectionStatus>('idle')
  const retryCount = ref(0)
  const lastMessagePayload = ref<{ content: string; mentions?: MentionReference[] } | null>(null)
  const abortController = ref<AbortController | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const MAX_AUTO_RETRIES = 3
  const RETRY_BASE_DELAY_MS = 2000

  function setSseStatus(status: SSEConnectionStatus) {
    sseStatus.value = status
  }

  function incrementRetryCount() {
    retryCount.value++
  }

  function resetRetryCount() {
    retryCount.value = 0
  }

  function setLastMessagePayload(payload: { content: string; mentions?: MentionReference[] } | null) {
    lastMessagePayload.value = payload
  }

  function setAbortController(controller: AbortController | null) {
    abortController.value = controller
  }

  function abort() {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null) {
    error.value = message
  }

  return {
    sseStatus,
    retryCount,
    lastMessagePayload,
    abortController,
    loading,
    error,
    MAX_AUTO_RETRIES,
    RETRY_BASE_DELAY_MS,
    setSseStatus,
    incrementRetryCount,
    resetRetryCount,
    setLastMessagePayload,
    setAbortController,
    abort,
    setLoading,
    setError,
  }
})
