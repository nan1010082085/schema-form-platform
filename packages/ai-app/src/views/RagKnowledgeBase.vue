<script setup lang="ts">
/**
 * RAG 知识库管理页面
 *
 * 功能：
 * - 展示索引状态总览（已索引/未索引/过期）
 * - 已索引 Schema 列表
 * - 手动触发单个/批量重建索引
 * - 批量选择、批量索引、批量删除
 * - 语义搜索测试
 */

import { ref, onMounted, computed } from 'vue'
import { message, confirmDanger } from '@schema-form/shared-utils/message'
import {
  getRagStatus,
  reindexAllRag,
  reindexSingleRag,
  deleteRagEmbedding,
  searchRag,
} from '@/api/aiApi'
import type {
  RagStatusData,
  RagReindexResult,
} from '@/api/aiApi'
import type { RagSearchResult } from '@/types'

// ---- State ----

const loading = ref(false)
const reindexing = ref(false)
const status = ref<RagStatusData | null>(null)
const lastReindexResult = ref<RagReindexResult | null>(null)

// ---- Bulk operations ----

const bulkMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const bulkProcessing = ref(false)

function toggleBulkMode() {
  bulkMode.value = !bulkMode.value
  selectedIds.value.clear()
}

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleSelectAll() {
  const items = status.value?.unindexedSchemas ?? []
  if (selectedIds.value.size === items.length) {
    selectedIds.value.clear()
  } else {
    selectedIds.value = new Set(items.map((s: { id: string }) => s.id))
  }
}

const allSelected = computed(() => {
  const items = status.value?.unindexedSchemas ?? []
  return items.length > 0 && selectedIds.value.size === items.length
})

async function handleBulkReindex() {
  if (selectedIds.value.size === 0) return
  bulkProcessing.value = true
  let success = 0
  let fail = 0
  for (const id of selectedIds.value) {
    try {
      await reindexSingleRag(id)
      success++
    } catch {
      fail++
    }
  }
  bulkProcessing.value = false
  if (fail === 0) message.success(`批量索引完成: ${success} 个`)
  else message.warning(`索引 ${success} 个成功，${fail} 个失败`)
  selectedIds.value.clear()
  bulkMode.value = false
  await loadStatus()
}

async function handleBulkDeleteEmbedding() {
  if (selectedIds.value.size === 0) return
  try {
    await confirmDanger('批量删除', `确认删除选中的 ${selectedIds.value.size} 个索引？`)
  } catch { return }

  bulkProcessing.value = true
  let success = 0
  let fail = 0
  for (const id of selectedIds.value) {
    try {
      await deleteRagEmbedding(id)
      success++
    } catch {
      fail++
    }
  }
  bulkProcessing.value = false
  if (fail === 0) message.success(`已删除 ${success} 个索引`)
  else message.warning(`删除 ${success} 个成功，${fail} 个失败`)
  selectedIds.value.clear()
  bulkMode.value = false
  await loadStatus()
}

// ---- Search test ----

const searchQuery = ref('')
const searchLoading = ref(false)
const searchResults = ref<RagSearchResult[]>([])
const searchPerformed = ref(false)

// ---- Computed ----

const healthPercent = computed(() => {
  if (!status.value || status.value.totalSchemas === 0) return 0
  return Math.round((status.value.indexed / status.value.totalSchemas) * 100)
})

const healthStatus = computed<'success' | 'warning' | 'danger'>(() => {
  if (healthPercent.value >= 90) return 'success'
  if (healthPercent.value >= 50) return 'warning'
  return 'danger'
})

// ---- Data Loading ----

async function loadStatus(): Promise<void> {
  loading.value = true
  try {
    status.value = await getRagStatus()
  } catch {
    message.error('加载 RAG 状态失败')
  } finally {
    loading.value = false
  }
}

// ---- Reindex ----

async function handleReindexAll(): Promise<void> {
  reindexing.value = true
  try {
    lastReindexResult.value = await reindexAllRag()
    message.success('批量重建索引完成')
    await loadStatus()
  } catch {
    message.error('批量重建索引失败')
  } finally {
    reindexing.value = false
  }
}

async function handleReindexSingle(schemaId: string): Promise<void> {
  try {
    await reindexSingleRag(schemaId)
    message.success('索引重建成功')
    await loadStatus()
  } catch {
    message.error('索引重建失败')
  }
}

async function handleDeleteEmbedding(schemaId: string): Promise<void> {
  try {
    await deleteRagEmbedding(schemaId)
    message.success('索引已删除')
    await loadStatus()
  } catch {
    message.error('删除索引失败')
  }
}

// ---- Search test ----

async function handleSearch(): Promise<void> {
  const query = searchQuery.value.trim()
  if (!query) return

  searchLoading.value = true
  searchPerformed.value = true
  try {
    const result = await searchRag({ query, limit: 10 })
    searchResults.value = result.schemas
  } catch {
    message.error('搜索失败')
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

function getScoreClass(score: number): string {
  if (score >= 70) return 'scoreHigh'
  if (score >= 40) return 'scoreMedium'
  return 'scoreLow'
}

// ---- Formatters ----

function getSchemaTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    form: '表单',
    search_list: '查询列表',
  }
  return labels[type] ?? type
}

// ---- Lifecycle ----

onMounted(() => {
  loadStatus()
})
</script>

<template>
  <div :class="$style.page">
    <!-- Topbar -->
    <div :class="$style.topbar">
      <div :class="$style.topbarLeft">
        <div :class="$style.topbarLogo">
          <div :class="$style.topbarIcon">KB</div>
          <span :class="$style.topbarBrand">RAG 知识库管理</span>
        </div>
      </div>
      <div :class="$style.topbarRight">
        <t-button
          theme="primary"
          size="small"
          :loading="reindexing"
          @click="handleReindexAll"
        >
          {{ reindexing ? '索引中...' : '批量重建索引' }}
        </t-button>
        <t-button
          size="small"
          :loading="loading"
          @click="loadStatus"
        >
          刷新状态
        </t-button>
      </div>
    </div>

    <!-- Body -->
    <div :class="$style.body">
      <!-- Summary cards -->
      <div :class="$style.summaryGrid">
        <div :class="$style.summaryCard">
          <div :class="$style.summaryLabel">Schema 总数</div>
          <div :class="$style.summaryValue">{{ status?.totalSchemas ?? '-' }}</div>
        </div>
        <div :class="$style.summaryCard">
          <div :class="$style.summaryLabel">已索引</div>
          <div :class="[$style.summaryValue, $style.success]">{{ status?.indexed ?? '-' }}</div>
        </div>
        <div :class="$style.summaryCard">
          <div :class="$style.summaryLabel">未索引</div>
          <div :class="[$style.summaryValue, status?.unindexed ? $style.warning : '']">{{ status?.unindexed ?? '-' }}</div>
        </div>
        <div :class="$style.summaryCard">
          <div :class="$style.summaryLabel">过期索引</div>
          <div :class="[$style.summaryValue, status?.stale ? $style.danger : '']">{{ status?.stale ?? '-' }}</div>
        </div>
        <div :class="$style.summaryCard">
          <div :class="$style.summaryLabel">索引覆盖率</div>
          <div :class="[$style.summaryValue, $style[healthStatus]]">{{ healthPercent }}%</div>
        </div>
      </div>

      <!-- Reindex result -->
      <div v-if="lastReindexResult" :class="$style.reindexResult">
        <strong>上次批量索引结果：</strong>
        总计 {{ lastReindexResult.total }} 个 Schema，
        新建 {{ lastReindexResult.created }}，
        更新 {{ lastReindexResult.updated }}，
        跳过 {{ lastReindexResult.skipped }}，
        失败 {{ lastReindexResult.errors }}
      </div>

      <!-- Unindexed schemas -->
      <div :class="$style.section">
        <div :class="$style.sectionHeader">
          <h3 :class="$style.sectionTitle">未索引 Schema</h3>
          <div :class="$style.bulkActions">
            <t-button
              size="small"
              :theme="bulkMode ? 'danger' : 'default'"
              @click="toggleBulkMode"
            >
              {{ bulkMode ? '取消' : '批量操作' }}
            </t-button>
            <template v-if="bulkMode">
              <t-button
                size="small"
                theme="primary"
                :disabled="selectedIds.size === 0"
                :loading="bulkProcessing"
                @click="handleBulkReindex"
              >
                批量索引 ({{ selectedIds.size }})
              </t-button>
              <t-button
                size="small"
                theme="danger"
                :disabled="selectedIds.size === 0"
                :loading="bulkProcessing"
                @click="handleBulkDeleteEmbedding"
              >
                批量删除索引 ({{ selectedIds.size }})
              </t-button>
            </template>
          </div>
        </div>
        <t-table
          :data="status?.unindexedSchemas ?? []"
          :class="$style.table"
          stripe
          size="small"
          empty-text="所有 Schema 均已索引"
          :columns="[
            ...(bulkMode ? [{ colKey: 'select', title: '', width: 48 }] : []),
            { colKey: 'name', title: '名称', minWidth: 200 },
            { colKey: 'type', title: '类型', width: 120 },
            { colKey: 'action', title: '操作', width: 160, fixed: 'right' },
          ]"
        >
          <template #select="{ row }">
            <t-checkbox
              :checked="selectedIds.has(row.id)"
              @change="toggleSelect(row.id)"
            />
          </template>
          <template #header-select>
            <t-checkbox
              :checked="allSelected"
              @change="toggleSelectAll"
            />
          </template>
          <template #type="{ row }">
            <t-tag size="small" :theme="row.type === 'form' ? 'primary' : 'success'">
              {{ getSchemaTypeLabel(row.type) }}
            </t-tag>
          </template>
          <template #action="{ row }">
            <t-button
              theme="primary"
              variant="text"
              size="small"
              @click="handleReindexSingle(row.id)"
            >
              建立索引
            </t-button>
          </template>
        </t-table>
      </div>

      <!-- Search test -->
      <div :class="$style.section">
        <div :class="$style.sectionHeader">
          <h3 :class="$style.sectionTitle">语义搜索测试</h3>
        </div>
        <div :class="$style.searchArea">
          <t-input
            v-model="searchQuery"
            :class="$style.searchInput"
            placeholder="输入自然语言描述，如：用户注册表单"
            clearable
            @keyup.enter="handleSearch"
          />
          <t-button
            theme="primary"
            :loading="searchLoading"
            @click="handleSearch"
          >
            搜索
          </t-button>
        </div>

        <div :class="$style.searchResults">
          <template v-if="searchResults.length > 0">
            <div
              v-for="item in searchResults"
              :key="item.id"
              :class="$style.searchResultItem"
            >
              <div :class="[$style.resultScore, $style[getScoreClass(item.score)]]">
                {{ item.score }}
              </div>
              <div :class="$style.resultInfo">
                <div :class="$style.resultName">{{ item.name }}</div>
                <div v-if="item.description" :class="$style.resultDesc">
                  {{ item.description }}
                </div>
                <div :class="$style.resultTags">
                  <span
                    v-for="wt in item.widgetTypes.slice(0, 5)"
                    :key="wt"
                    :class="$style.resultTag"
                  >
                    {{ wt }}
                  </span>
                  <span v-if="item.widgetTypes.length > 5" :class="$style.resultTag">
                    +{{ item.widgetTypes.length - 5 }}
                  </span>
                </div>
              </div>
            </div>
          </template>
          <div v-else-if="searchPerformed && !searchLoading" :class="$style.emptyHint">
            未找到匹配的 Schema
          </div>
          <div v-else-if="!searchPerformed" :class="$style.emptyHint">
            输入自然语言描述，测试 RAG 语义搜索效果
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style module src="./RagKnowledgeBase.module.css" />
