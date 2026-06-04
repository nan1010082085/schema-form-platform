<script setup lang="ts">
/**
 * AiConversationSearch — 对话列表搜索组件
 *
 * 搜索对话标题和消息内容，展示匹配结果。
 * 点击结果跳转到对应对话。
 */

import { ref, watch, onBeforeUnmount } from 'vue'
import { useAiStore } from '@/stores/ai'
import type { Conversation } from '@/types'

export interface AiConversationSearchResult {
  conversations: Conversation[]
  total: number
}

const emit = defineEmits<{
  select: [id: string]
}>()

const store = useAiStore()

const query = ref('')
const results = ref<Conversation[]>([])
const total = ref(0)
const searching = ref(false)
const panelVisible = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null

function debounceSearch(q: string): void {
  if (searchTimer) clearTimeout(searchTimer)
  if (!q.trim()) {
    results.value = []
    total.value = 0
    panelVisible.value = false
    return
  }
  searching.value = true
  panelVisible.value = true
  searchTimer = setTimeout(async () => {
    try {
      const data = await store.searchConversationsAction(q)
      results.value = data.conversations
      total.value = data.total
    } catch {
      results.value = []
      total.value = 0
    } finally {
      searching.value = false
    }
  }, 300)
}

watch(query, (val) => debounceSearch(val))

function handleSelect(id: string): void {
  emit('select', id)
  query.value = ''
  panelVisible.value = false
}

function handleClear(): void {
  query.value = ''
  panelVisible.value = false
}

/** 格式化时间 YYYYMMDD hhmmss */
function formatTime(date: Date | string): string {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  const Y = d.getFullYear()
  const M = pad(d.getMonth() + 1)
  const D = pad(d.getDate())
  const h = pad(d.getHours())
  const m = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${Y}${M}${D} ${h}${m}${s}`
}

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div :class="$style.wrapper">
    <!-- Search bar -->
    <div :class="$style.searchBar">
      <div :class="$style.searchIcon">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <input
        v-model="query"
        :class="$style.searchInput"
        placeholder="搜索对话..."
        type="text"
      />
      <button
        v-if="query"
        :class="$style.clearBtn"
        title="清除"
        @click="handleClear"
      >
        &times;
      </button>
    </div>

    <!-- Search results -->
    <div v-if="panelVisible" :class="$style.results">
      <div v-if="searching" :class="$style.loading">搜索中...</div>
      <template v-else-if="results.length > 0">
        <div :class="$style.resultCount">找到 {{ total }} 条结果</div>
        <div
          v-for="conv in results"
          :key="conv.id"
          :class="$style.resultItem"
          @click="handleSelect(conv.id)"
        >
          <div :class="$style.resultHeader">
            <span :class="$style.resultTitle">{{ conv.title }}</span>
            <span :class="[$style.sourceTag, $style[conv.source]]">
              {{ conv.source === 'editor' ? 'Editor' : conv.source === 'flow' ? 'Flow' : 'AI' }}
            </span>
          </div>
          <div :class="$style.resultTime">{{ formatTime(conv.updatedAt) }}</div>
        </div>
      </template>
      <div v-else :class="$style.empty">无匹配对话</div>
    </div>
  </div>
</template>

<style module src="./AiConversationSearch.module.css" />
