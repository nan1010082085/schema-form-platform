<script setup lang="ts">
/**
 * AiConversationSearch — 对话列表搜索组件
 *
 * 搜索对话标题和消息内容，展示匹配结果。
 * 支持时间范围筛选和来源筛选。
 * 点击结果跳转到对应对话。
 */

import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { useAiStore } from '@/stores/ai'
import type { Conversation } from '@/types'
import type { SearchConversationsParams } from '@/api/aiApi'

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

// ---- 筛选状态 ----
const filtersExpanded = ref(false)
const startDate = ref('')
const endDate = ref('')
const sourceFilter = ref('')

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: 'editor', label: 'Editor' },
  { value: 'flow', label: 'Flow' },
  { value: 'standalone', label: 'AI' },
]

const hasActiveFilters = computed(() =>
  startDate.value !== '' || endDate.value !== '' || sourceFilter.value !== '',
)

let searchTimer: ReturnType<typeof setTimeout> | null = null

function debounceSearch(): void {
  if (searchTimer) clearTimeout(searchTimer)

  const hasQuery = query.value.trim() !== ''
  const hasFilters = hasActiveFilters.value

  if (!hasQuery && !hasFilters) {
    results.value = []
    total.value = 0
    panelVisible.value = false
    return
  }

  searching.value = true
  panelVisible.value = true

  searchTimer = setTimeout(async () => {
    try {
      const params: SearchConversationsParams = {}
      if (query.value.trim()) params.keyword = query.value.trim()
      if (startDate.value) params.startDate = startDate.value
      if (endDate.value) params.endDate = endDate.value
      if (sourceFilter.value) params.source = sourceFilter.value

      const data = await store.searchConversationsAction(params)
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

watch(query, () => debounceSearch())
watch([startDate, endDate, sourceFilter], () => debounceSearch())

function handleSelect(id: string): void {
  emit('select', id)
  query.value = ''
  panelVisible.value = false
}

function handleClear(): void {
  query.value = ''
  startDate.value = ''
  endDate.value = ''
  sourceFilter.value = ''
  panelVisible.value = false
}

function toggleFilters(): void {
  filtersExpanded.value = !filtersExpanded.value
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
      <el-input
        v-model:value="query"
        :class="$style.searchInput"
        placeholder="搜索对话..."
        size="small"
        clearable
        @clear="handleClear"
      />
      <el-button
        :class="[$style.filterToggle, { [$style.filterToggleActive]: hasActiveFilters || filtersExpanded }]"
        title="筛选"
        link
        size="small"
        @click="toggleFilters"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      </el-button>
    </div>

    <!-- Filter panel -->
    <div v-if="filtersExpanded" :class="$style.filterPanel">
      <div :class="$style.filterRow">
        <label :class="$style.filterLabel">来源</label>
        <el-select v-model:value="sourceFilter" :class="$style.filterSelect" size="small" placeholder="全部来源" :options="SOURCE_OPTIONS" />
      </div>
      <div :class="$style.filterRow">
        <label :class="$style.filterLabel">时间</label>
        <div :class="$style.filterDateRange">
          <t-date-picker
            v-model:value="startDate"
            :class="$style.filterDate"
            placeholder="开始日期"
            size="small"
            format="YYYY-MM-DD"
          />
          <span :class="$style.filterDateSep">~</span>
          <t-date-picker
            v-model:value="endDate"
            :class="$style.filterDate"
            placeholder="结束日期"
            size="small"
            format="YYYY-MM-DD"
          />
        </div>
      </div>
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
