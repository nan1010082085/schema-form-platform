/**
 * RAG 状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RagSearchResult } from '@/types'
import { searchRag } from '@/api/aiApi'

export const useRagStore = defineStore('ai-rag', () => {
  const searchResults = ref<RagSearchResult[]>([])
  const searching = ref(false)
  const context = ref<RagSearchResult[]>([])

  async function search(query: string) {
    searching.value = true
    try {
      const results = await searchRag(query)
      searchResults.value = results
    } finally {
      searching.value = false
    }
  }

  function addContext(item: RagSearchResult) {
    if (!context.value.find(c => c.id === item.id)) {
      context.value.push(item)
    }
  }

  function removeContext(id: string) {
    context.value = context.value.filter(c => c.id !== id)
  }

  function clearContext() {
    context.value = []
  }

  function clearSearchResults() {
    searchResults.value = []
  }

  return {
    searchResults,
    searching,
    context,
    search,
    addContext,
    removeContext,
    clearContext,
    clearSearchResults,
  }
})
