<script setup lang="ts">
/**
 * GlobalSearch — 全局搜索组件
 *
 * 支持搜索 Schema 实例和流程定义。
 * Cmd/Ctrl+K 快捷键打开。
 * 结果按类型分组展示，点击跳转到对应页面。
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Document, Connection } from '@element-plus/icons-vue'
import { apiClient } from '@/utils/apiClient'
import styles from './GlobalSearch.module.css'

const router = useRouter()
const visible = ref(false)
const searchQuery = ref('')
const loading = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

interface SearchResult {
  id: string
  name: string
  type: 'schema' | 'flow'
  description?: string
  updatedAt?: string
}

const results = ref<SearchResult[]>([])
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// ---- 快捷键 ----

function handleKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    visible.value = true
  }
  if (e.key === 'Escape' && visible.value) {
    visible.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// ---- 搜索 ----

watch(searchQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!val.trim()) {
    results.value = []
    return
  }
  debounceTimer = setTimeout(() => doSearch(val.trim()), 300)
})

async function doSearch(query: string) {
  loading.value = true
  try {
    const [schemas, flows] = await Promise.allSettled([
      apiClient.get<{ items: Array<{ id: string; name: string; updatedAt?: string }> }>(
        `/schemas?search=${encodeURIComponent(query)}&pageSize=5`,
      ),
      apiClient.get<{ items: Array<{ id: string; name: string; description?: string; updatedAt?: string }> }>(
        `/flows?search=${encodeURIComponent(query)}&pageSize=5`,
      ),
    ])

    const items: SearchResult[] = []

    if (schemas.status === 'fulfilled' && schemas.value?.items) {
      for (const s of schemas.value.items) {
        items.push({ id: s.id, name: s.name, type: 'schema', updatedAt: s.updatedAt })
      }
    }

    if (flows.status === 'fulfilled' && flows.value?.items) {
      for (const f of flows.value.items) {
        items.push({ id: f.id, name: f.name, type: 'flow', description: f.description, updatedAt: f.updatedAt })
      }
    }

    results.value = items
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}

const schemaResults = computed(() => results.value.filter(r => r.type === 'schema'))
const flowResults = computed(() => results.value.filter(r => r.type === 'flow'))

// ---- 选择 ----

function handleSelect(item: SearchResult) {
  visible.value = false
  searchQuery.value = ''
  if (item.type === 'schema') {
    router.push({ path: '/editor', query: { id: item.id } })
  } else {
    router.push({ path: '/flow', query: { id: item.id } })
  }
}

function handleOpen() {
  visible.value = true
  setTimeout(() => searchInputRef.value?.focus(), 100)
}

function handleClose() {
  visible.value = false
  searchQuery.value = ''
  results.value = []
}

function formatDate(d?: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}
</script>

<template>
  <div>
    <button :class="styles.trigger" @click="handleOpen" title="全局搜索 (⌘K)">
      <el-icon :size="14"><Search /></el-icon>
      <span :class="styles.triggerText">搜索...</span>
      <kbd :class="styles.shortcut">⌘K</kbd>
    </button>

    <el-dialog
      v-model="visible"
      :show-close="false"
      :width="560"
      :class="styles.dialog"
      append-to-body
      @close="handleClose"
    >
      <div :class="styles.searchBox">
        <el-icon :size="16" :class="styles.searchIcon"><Search /></el-icon>
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          :class="styles.searchInput"
          placeholder="搜索 Schema、流程..."
          autofocus
        />
      </div>

      <div :class="styles.results" v-loading="loading">
        <template v-if="results.length > 0">
          <div v-if="schemaResults.length > 0" :class="styles.group">
            <div :class="styles.groupTitle">
              <el-icon :size="14"><Document /></el-icon>
              Schema 实例
            </div>
            <div
              v-for="item in schemaResults"
              :key="item.id"
              :class="styles.resultItem"
              @click="handleSelect(item)"
            >
              <div :class="styles.resultName">{{ item.name }}</div>
              <div :class="styles.resultMeta">{{ formatDate(item.updatedAt) }}</div>
            </div>
          </div>

          <div v-if="flowResults.length > 0" :class="styles.group">
            <div :class="styles.groupTitle">
              <el-icon :size="14"><Connection /></el-icon>
              流程定义
            </div>
            <div
              v-for="item in flowResults"
              :key="item.id"
              :class="styles.resultItem"
              @click="handleSelect(item)"
            >
              <div :class="styles.resultName">{{ item.name }}</div>
              <div v-if="item.description" :class="styles.resultDesc">{{ item.description }}</div>
              <div :class="styles.resultMeta">{{ formatDate(item.updatedAt) }}</div>
            </div>
          </div>
        </template>

        <div v-else-if="searchQuery.trim() && !loading" :class="styles.empty">
          未找到匹配结果
        </div>
        <div v-else-if="!searchQuery.trim()" :class="styles.hint">
          输入关键词搜索 Schema 和流程
        </div>
      </div>
    </el-dialog>
  </div>
</template>
