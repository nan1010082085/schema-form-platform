/**
 * 版本历史状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { VersionEntry } from '@/types'
import { getVersions, rollbackVersion } from '@/api/aiApi'

export const useVersionStore = defineStore('ai-version', () => {
  const versionHistory = ref<VersionEntry[]>([])
  const currentVersionIndex = ref<number>(-1)

  async function fetchVersions(conversationId: string) {
    const data = await getVersions(conversationId)
    versionHistory.value = data
    currentVersionIndex.value = data.length - 1
  }

  async function rollback(index: number) {
    const version = versionHistory.value[index]
    if (version) {
      await rollbackVersion(version.id)
      currentVersionIndex.value = index
    }
  }

  function setCurrentVersionIndex(index: number) {
    currentVersionIndex.value = index
  }

  function clearVersionHistory() {
    versionHistory.value = []
    currentVersionIndex.value = -1
  }

  return {
    versionHistory,
    currentVersionIndex,
    fetchVersions,
    rollback,
    setCurrentVersionIndex,
    clearVersionHistory,
  }
})
