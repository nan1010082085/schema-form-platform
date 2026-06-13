<script setup lang="ts">
/**
 * WorkflowExecutionView — 执行监控页
 *
 * 统计卡片 + 执行历史列表 + 搜索筛选 + 执行详情展开（含时间轴和变量快照）。
 */
import { onMounted, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  SearchIcon,
  TimeIcon,
  OrderListIcon,
  ChartIcon,
  BrowseIcon,
  LoadingIcon,
  CheckCircleFilledIcon,
  CloseCircleFilledIcon,
} from 'tdesign-icons-vue-next'
import { apiClient } from '@/utils/apiClient'
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
    MessagePlugin.error(err instanceof Error ? err.message : '加载失败')
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
    MessagePlugin.error(err instanceof Error ? err.message : '加载统计失败')
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
    MessagePlugin.error(err instanceof Error ? err.message : '加载详情失败')
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

function statusTheme(s: string): 'default' | 'success' | 'warning' | 'danger' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
    running: 'default',
    completed: 'success',
    failed: 'danger',
    terminated: 'warning',
    suspended: 'default',
  }
  return map[s] ?? 'default'
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
          <OrderListIcon />
          执行记录
        </button>
        <button
          :class="[styles.tab, activeTab === 'stats' && styles.tabActive]"
          @click="activeTab = 'stats'"
        >
          <ChartIcon />
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
            <OrderListIcon :size="24" />
          </div>
          <div :class="styles.statBody">
            <div :class="styles.statValue">{{ stats?.total ?? '-' }}</div>
            <div :class="styles.statLabel">总执行数</div>
          </div>
        </div>

        <div :class="styles.statCard">
          <div :class="[styles.statIcon, styles.statIconRunning]">
            <LoadingIcon :size="24" />
          </div>
          <div :class="styles.statBody">
            <div :class="styles.statValue">{{ stats?.statusBreakdown?.running ?? 0 }}</div>
            <div :class="styles.statLabel">运行中</div>
          </div>
        </div>

        <div :class="styles.statCard">
          <div :class="[styles.statIcon, styles.statIconCompleted]">
            <CheckCircleFilledIcon :size="24" />
          </div>
          <div :class="styles.statBody">
            <div :class="styles.statValue">{{ stats?.completed ?? 0 }}</div>
            <div :class="styles.statLabel">已完成</div>
          </div>
        </div>

        <div :class="styles.statCard">
          <div :class="[styles.statIcon, styles.statIconFailed]">
            <CloseCircleFilledIcon :size="24" />
          </div>
          <div :class="styles.statBody">
            <div :class="styles.statValue">{{ stats?.failed ?? 0 }}</div>
            <div :class="styles.statLabel">失败</div>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div :class="styles.toolbar">
        <t-input
          v-model="searchInput"
          placeholder="搜索工作流名称..."
          clearable
          :class="styles.search"
          @input="handleSearch"
          @clear="handleSearch('')"
        >
          <template #prefix-icon><SearchIcon /></template>
        </t-input>
        <t-select v-model:value="activeStatus" :class="styles.statusFilter">
          <t-option
            v-for="opt in statusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </div>

      <!-- Loading -->
      <t-skeleton v-if="loading && executions.length === 0" :row-col="[{ width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }]" animation="gradient" />

      <!-- Empty -->
      <div v-else-if="!loading && executions.length === 0" :class="styles.empty">
        <TimeIcon :size="48" />
        <p>暂无执行记录</p>
      </div>

      <!-- Table -->
      <t-table
        v-else
        :data="executions"
        :columns="[
          { colKey: 'workflowName', title: '工作流名称', minWidth: 180 },
          { colKey: 'status', title: '状态', width: 100 },
          { colKey: 'duration', title: '执行时长', width: 120 },
          { colKey: 'initiatedBy', title: '发起人', width: 120 },
          { colKey: 'startedAt', title: '开始时间', width: 180 },
          { colKey: 'actions', title: '操作', width: 80, fixed: 'right' },
        ]"
        stripe
        :class="styles.table"
        row-key="id"
      >
        <template #workflowName="{ row }">
          <span :class="styles.workflowName">{{ row.workflowName }}</span>
        </template>
        <template #status="{ row }">
          <t-tag :theme="statusTheme(row.status)" size="small">
            {{ statusLabel(row.status) }}
          </t-tag>
        </template>
        <template #duration="{ row }">
          <span :class="styles.duration">
            <TimeIcon :size="14" />
            {{ formatDuration(row.startedAt, row.completedAt) }}
          </span>
        </template>
        <template #startedAt="{ row }">
          {{ formatDate(row.startedAt) }}
        </template>
        <template #actions="{ row }">
          <t-button
            variant="text"
            theme="primary"
            size="small"
            @click="openDetail(row.id)"
          >
            <template #icon><BrowseIcon /></template>
            详情
          </t-button>
        </template>
      </t-table>

      <!-- Pagination -->
      <div v-if="total > 0" :class="styles.pagination">
        <t-pagination
          v-model="page"
          :page-size="pageSize"
          :total="total"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Detail Drawer -->
    <t-drawer
      v-model:visible="detailVisible"
      header="执行详情"
      placement="right"
      size="600px"
    >
      <div v-if="detailLoading" style="padding: 20px">
        <t-skeleton :row-col="[{ width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }]" animation="gradient" />
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
            <t-tag :theme="statusTheme(selectedExecution.status)" size="small">
              {{ statusLabel(selectedExecution.status) }}
            </t-tag>
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
    </t-drawer>
  </div>
</template>
