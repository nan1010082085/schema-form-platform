<script setup lang="ts">
/**
 * WorkflowMonitorView — 工作流执行监控面板
 *
 * 展示工作流执行历史列表、执行状态筛选、统计图表。
 */
import { onMounted, ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Timer, TrendCharts, List, View } from '@element-plus/icons-vue'
import { apiClient } from '@/utils/apiClient'
import WorkflowStats from '@/components/WorkflowStats.vue'
import WorkflowExecutionDetail from '@/components/WorkflowExecutionDetail.vue'
import styles from './WorkflowMonitorView.module.scss'

// ── Types ──
interface ExecutionItem {
  id: string
  definitionId: string
  workflowName: string
  status: 'running' | 'completed' | 'terminated' | 'suspended' | 'failed'
  variables: Record<string, unknown>
  initiatedBy: string
  startedAt: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

interface PaginatedExecutions {
  items: ExecutionItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── State ──
const loading = ref(false)
const executions = ref<ExecutionItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)

const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
const activeStatus = ref('')
const activeTab = ref<'list' | 'stats'>('list')

// Detail panel
const detailVisible = ref(false)
const selectedExecutionId = ref<string | null>(null)

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '运行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
  { label: '已终止', value: 'terminated' },
  { label: '已挂起', value: 'suspended' },
]

// ── Fetch ──
async function fetchExecutions() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      pageSize: String(pageSize.value),
    }
    if (activeStatus.value) params.status = activeStatus.value
    if (searchInput.value.trim()) params.search = searchInput.value.trim()

    const data = await apiClient.get<PaginatedExecutions>('/workflow-executions', params)
    executions.value = data.items
    total.value = data.total
    totalPages.value = data.totalPages
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchExecutions)

function handleSearch(val: string) {
  searchInput.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchExecutions()
  }, 300)
}

watch(activeStatus, () => {
  page.value = 1
  fetchExecutions()
})

function handlePageChange(p: number) {
  page.value = p
  fetchExecutions()
}

// ── Detail ──
function openDetail(id: string) {
  selectedExecutionId.value = id
  detailVisible.value = true
}

// ── Helpers ──
function statusLabel(s: string): string {
  const map: Record<string, string> = {
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    terminated: '已终止',
    suspended: '已挂起',
  }
  return map[s] ?? s
}

function statusType(s: string): '' | 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, '' | 'success' | 'info' | 'warning' | 'danger'> = {
    running: '',
    completed: 'success',
    failed: 'danger',
    terminated: 'warning',
    suspended: 'info',
  }
  return map[s] ?? 'info'
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '-'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

function formatDate(d: string): string {
  return new Date(d).toLocaleString('zh-CN')
}
</script>

<template>
  <div :class="styles.root">
    <!-- Header -->
    <div :class="styles.header">
      <div :class="styles.titleRow">
        <div>
          <h1 :class="styles.title">工作流监控</h1>
          <p :class="styles.subtitle">查看工作流执行历史和统计信息</p>
        </div>
      </div>

      <!-- Tabs -->
      <div :class="styles.tabBar">
        <button
          :class="[styles.tab, activeTab === 'list' && styles.tabActive]"
          @click="activeTab = 'list'"
        >
          <el-icon><List /></el-icon>
          执行记录
        </button>
        <button
          :class="[styles.tab, activeTab === 'stats' && styles.tabActive]"
          @click="activeTab = 'stats'"
        >
          <el-icon><TrendCharts /></el-icon>
          统计分析
        </button>
      </div>
    </div>

    <!-- Stats Tab -->
    <div v-if="activeTab === 'stats'" :class="styles.content">
      <WorkflowStats />
    </div>

    <!-- List Tab -->
    <div v-else :class="styles.content">
      <!-- Filter bar -->
      <div :class="styles.toolbar">
        <el-input
          v-model="searchInput"
          :prefix-icon="Search"
          placeholder="搜索工作流名称..."
          clearable
          :class="styles.search"
          @input="handleSearch"
          @clear="handleSearch('')"
        />
        <el-select v-model="activeStatus" :class="styles.statusFilter">
          <el-option
            v-for="opt in statusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <!-- Loading -->
      <el-skeleton v-if="loading && executions.length === 0" :rows="8" animated />

      <!-- Empty -->
      <div v-else-if="!loading && executions.length === 0" :class="styles.empty">
        <el-icon :size="48"><Timer /></el-icon>
        <p>暂无执行记录</p>
      </div>

      <!-- Table -->
      <el-table v-else :data="executions" stripe :class="styles.table">
        <el-table-column label="工作流名称" min-width="180">
          <template #default="{ row }">
            <span :class="styles.workflowName">{{ row.workflowName }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="执行时长" width="120">
          <template #default="{ row }">
            <span :class="styles.duration">
              <el-icon :size="14"><Timer /></el-icon>
              {{ formatDuration(row.startedAt, row.completedAt) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="发起人" width="120" prop="initiatedBy" />

        <el-table-column label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.startedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              :icon="View"
              @click="openDetail(row.id)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div v-if="total > 0" :class="styles.pagination">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Detail Drawer -->
    <WorkflowExecutionDetail
      v-model:visible="detailVisible"
      :execution-id="selectedExecutionId"
    />
  </div>
</template>
