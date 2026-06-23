/**
 * RAG 搜索管理 Store
 *
 * 职责：RAG 搜索、上下文管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RagSearchResult } from '@/types'
import { searchRag } from '@/api/aiApi'

export const useRAGStore = defineStore('rag', () => {
  // ---- State ----
  const ragSearchResults = ref<RagSearchResult[]>([])
  const ragSearching = ref(false)
  /** 用户选中的 RAG context，发送消息时携带 */
  const ragContext = ref<RagSearchResult[]>([])

  // ---- Actions ----
  async function searchRagAction(query: string, limit?: number): Promise<void> {
    if (!query.trim()) {
      ragSearchResults.value = []
      return
    }
    ragSearching.value = true
    try {
      const result = await searchRag({ query: query.trim(), limit: limit ?? 5 })
      ragSearchResults.value = result.schemas
    } catch (err) {
      ragSearchResults.value = []
      throw err
    } finally {
      ragSearching.value = false
    }
  }

  function addRagContext(item: RagSearchResult): void {
    if (!ragContext.value.find((c) => c.id === item.id)) {
      ragContext.value.push(item)
    }
  }

  function removeRagContext(id: string): void {
    ragContext.value = ragContext.value.filter((c) => c.id !== id)
  }

  function clearRagContext(): void {
    ragContext.value = []
    ragSearchResults.value = []
  }

  /**
   * 获取 RAG 上下文内容（用于注入消息）
   */
  function getRagContextContent(): string {
    if (ragContext.value.length === 0) return ''
    const ragBlock = ragContext.value
      .map((r) => `[引用 Schema: ${r.name}] (相似度 ${r.score}%, 组件: ${r.widgetTypes.join(', ')})`)
      .join('\n')
    // 发送后清除 RAG context
    ragContext.value = []
    return `[RAG 上下文]\n${ragBlock}\n\n`
  }

  return {
    // state
    ragSearchResults,
    ragSearching,
    ragContext,
    // actions
    searchRagAction,
    addRagContext,
    removeRagContext,
    clearRagContext,
    getRagContextContent,
  }
})
