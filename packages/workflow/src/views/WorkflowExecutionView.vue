<script setup lang="ts">
/**
 * WorkflowExecutionView — 执行监控页
 *
 * 统计卡片 + 执行历史列表 + 搜索筛选 + 执行详情展开（含时间轴和变量快照）。
 */
import { onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  Timer,
  List,
  TrendCharts,
  View,
  Loading,
  CircleCheck,
  CircleClose,
} from '@element-plus/icons-vue'
import { apiClient } from '@schema-form/shared-utils/apiClient'
import ExecutionTimeline from '@/components/ExecutionTimeline.vue'
import VariableSnapshot from '@/components/VariableSnapshot.vue'
import WorkflowStats from '@/components/WorkflowStats.vue'
import styles from './WorkflowExecutionView.module.scss'

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

interface NodeLog {
  id: string
  nodeId: string
  nodeName: string
  status: 'running' | 'completed' | 'failed' | 'skipped'
  input: Record<string, unknown>
  output: Record<string, unknown>
  error: string
  startedAt: string
  completedAt: string | null
  duration: number
}

interface ExecutionDetail extends ExecutionItem {
  workflowName: string
  nodeLogs: NodeLog[]
}

interface StatsData {
  total: number
  completed: number
  failed: number
  successRate: number
  avgDurationSec: number
  statusBreakdown: Record<string, number>
}

// ── State ──
const activeTab = ref<'list' | 'stats'>('list')
const loading = ref(false)
const executions = ref<ExecutionItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)

const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
const activeStatus = ref('')

// Stats
const statsLoading = ref(false)
const stats = ref<StatsData | null>(null)

// Detail drawer
const detailVisible = ref(false)
const detailLoading = ref(false)
const selectedExecution = ref<ExecutionDetail | null>(null)

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '运行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
  { label: '已终止', value: 'terminated' },
  { label: '已挂起', value: 'suspended' },
]

// ── Fetch executions ──
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

// ── Fetch stats ──
async function fetchStats() {
  statsLoading.value = true
  try {
    stats.value = await apiClient.get<StatsData>('/workflow-executions/stats', { days: '7' })
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载统计失败')
  } finally {
    statsLoading.value = false
  }
}

// ── Fetch detail ──
async function fetchDetail(id: string) {
  detailLoading.value = true
  try {
    selectedExecution.value = await apiClient.get<ExecutionDetail>(
      `/workflow-executions/${encodeURIComponent(id)}`,
    )
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载详情失败')
  } finally {
    detailLoading.value = false
  }
}

// ── Init ──
onMounted(() => {
  fetchExecutions()
  fetchStats()
})

// ── Search ──
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
  detailVisible.value = true
  fetchDetail(id)
}

// ── Helpers ──
function statusLabel(s: string): string {
  const map: Record<string, string> = {
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    terminated: '已终止',
    suspended: '已挂起',
    skipped: '已跳过',
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

function formatDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}
</script>

<template>
  <div :class="styles.root">
    <!-- Header -->
    <div :class="styles.header">
      <div :class="styles.titleRow">
        <div>
          <h1 :class="styles.title">执行监控</h1>
          <p :class="styles.subtitle">实时查看工作流执行状态、历史记录和统计分析</p>
        </div>
      </div>

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
      <!-- Stats Cards -->
      <div :class="styles.statsGrid">
        <div :class="styles.statCard">
          <div :class="[styles.statIcon, styles.statIconTotal]">
            <el-icon :size="24"><List /></el-icon>
          </div>
          <div :class="styles.statBody">
            <div :class="styles.statValue">{{ stats?.total ?? '-' }}</div>
            <div :class="styles.statLabel">总执行数</div>
          </div>
        </div>

        <div :class="styles.statCard">
          <div :class="[styles.statIcon, styles.statIconRunning]">
            <el-icon :size="24"><Loading /></el-icon>
          </div>
          <div :class="styles.statBody">
            <div :class="styles.statValue">{{ stats?.statusBreakdown?.running ?? 0 }}</div>
            <div :class="styles.statLabel">运行中</div>
          </div>
        </div>

        <div :class="styles.statCard">
          <div :class="[styles.statIcon, styles.statIconCompleted]">
            <el-icon :size="24"><CircleCheck /></el-icon>
          </div>
          <div :class="styles.statBody">
            <div :class="styles.statValue">{{ stats?.completed ?? 0 }}</div>
            <div :class="styles.statLabel">已完成</div>
          </div>
        </div>

        <div :class="styles.statCard">
          <div :class="[styles.statIcon, styles.statIconFailed]">
            <el-icon :size="24"><CircleClose /></el-icon>
          </div>
          <div :class="styles.statBody">
            <div :class="styles.statValue">{{ stats?.failed ?? 0 }}</div>
            <div :class="styles.statLabel">失败</div>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
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
    <el-drawer
      v-model="detailVisible"
      title="执行详情"
      direction="rtl"
      size="600px"
    >
      <div v-if="detailLoading" style="padding: 20px">
        <el-skeleton :rows="10" animated />
      </div>

      <div v-else-if="selectedExecution">
        <!-- Overview -->
        <div :class="styles.overviewSection">
          <div :class="styles.overviewRow">
            <span :class="styles.overviewLabel">工作流</span>
            <span :class="styles.overviewValue">{{ selectedExecution.workflowName }}</span>
          </div>
          <div :class="styles.overviewRow">
            <span :class="styles.overviewLabel">状态</span>
            <el-tag :type="statusType(selectedExecution.status)" size="small">
              {{ statusLabel(selectedExecution.status) }}
            </el-tag>
          </div>
          <div :class="styles.overviewRow">
            <span :class="styles.overviewLabel">发起人</span>
            <span :class="styles.overviewValue">{{ selectedExecution.initiatedBy }}</span>
          </div>
          <div :class="styles.overviewRow">
            <span :class="styles.overviewLabel">开始时间</span>
            <span :class="styles.overviewValue">{{ formatDate(selectedExecution.startedAt) }}</span>
          </div>
          <div :class="styles.overviewRow">
            <span :class="styles.overviewLabel">结束时间</span>
            <span :class="styles.overviewValue">{{ formatDate(selectedExecution.completedAt) }}</span>
          </div>
        </div>

        <!-- Variables -->
        <div :class="styles.sectionTitle">变量快照</div>
        <VariableSnapshot :variables="selectedExecution.variables" />

        <!-- Timeline -->
        <div :class="styles.sectionTitle">节点执行时间线</div>
        <ExecutionTimeline :node-logs="selectedExecution.nodeLogs ?? []" />
      </div>
    </el-drawer>
  </div>
</template>
