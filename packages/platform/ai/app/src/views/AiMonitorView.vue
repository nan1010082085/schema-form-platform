<script setup lang="ts">
/**
 * Agent 性能监控面板
 *
 * 展示 AI Agent 的运行指标：
 * - 总览摘要（成功率、平均响应时间、Token 消耗）
 * - 按 Agent/操作分组的详细统计
 * - 最近调用记录
 * - 性能告警
 */

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { message } from '@schema-form/platform-shared/utils/message'
import {
  getMonitorSummary,
  getMonitorStats,
  getMonitorRecent,
  getMonitorAlerts,
} from '@/api/aiApi'
import type {
  MonitorSummary,
  AgentMetricStats,
  AgentMetric,
  AgentAlert,
} from '@/types'
import MonitorSummaryCard from '@/components/monitor/MonitorSummary.vue'
import AgentDistribution from '@/components/monitor/AgentDistribution.vue'
import MetricTable from '@/components/monitor/MetricTable.vue'
import AlertList from '@/components/monitor/AlertList.vue'

// ---- State ----

const loading = ref(false)
const summary = ref<MonitorSummary | null>(null)
const stats = ref<AgentMetricStats[]>([])
const recentMetrics = ref<AgentMetric[]>([])
const alerts = ref<AgentAlert[]>([])
const selectedHours = ref(24)
const selectedAgent = ref<string>('')
const selectedOperation = ref<string>('')

// 自动刷新
let refreshTimer: ReturnType<typeof setInterval> | null = null
const AUTO_REFRESH_INTERVAL = 30000

// ---- Computed ----

const agentNames = computed(() => {
  const names = new Set(stats.value.map((s) => s.agentName))
  return Array.from(names).sort()
})

const operations = computed(() => {
  const ops = new Set(stats.value.map((s) => s.operation))
  return Array.from(ops).sort()
})

const agentDistribution = computed(() => {
  const agentStats = stats.value.reduce((acc, s) => {
    if (!acc[s.agentName]) {
      acc[s.agentName] = { totalCalls: 0, successRate: 0, avgDuration: 0, count: 0 }
    }
    acc[s.agentName].totalCalls += s.totalCalls
    acc[s.agentName].successRate += s.successRate
    acc[s.agentName].avgDuration += s.avgDuration
    acc[s.agentName].count++
    return acc
  }, {} as Record<string, { totalCalls: number; successRate: number; avgDuration: number; count: number }>)

  const total = Object.values(agentStats).reduce((sum, s) => sum + s.totalCalls, 0)

  return Object.entries(agentStats).map(([agent, data]) => ({
    agent,
    count: data.totalCalls,
    percentage: total > 0 ? Math.round((data.totalCalls / total) * 100) : 0,
    successRate: data.count > 0 ? data.successRate / data.count : 0,
    avgDuration: data.count > 0 ? data.avgDuration / data.count : 0,
  }))
})

const filteredStats = computed(() => {
  return stats.value.filter((s) => {
    if (selectedAgent.value && s.agentName !== selectedAgent.value) return false
    if (selectedOperation.value && s.operation !== selectedOperation.value) return false
    return true
  })
})

const filteredRecent = computed(() => {
  return recentMetrics.value.filter((m) => {
    if (selectedAgent.value && m.agentName !== selectedAgent.value) return false
    if (selectedOperation.value && m.operation !== selectedOperation.value) return false
    return true
  })
})

// ---- Formatters ----

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString()
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`
  return `${(tokens / 1000000).toFixed(1)}M`
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getAgentLabel(agentName: string): string {
  const labels: Record<string, string> = {
    thinker: '思考',
    editor: '表单',
    flow: '流程',
    general: '通用',
    summarizer: '总结',
    router: '路由',
  }
  return labels[agentName] ?? agentName
}

function getOperationLabel(operation: string): string {
  const labels: Record<string, string> = {
    invoke: '调用',
    tool_call: '工具',
    think: '思考',
    stream: '流式',
  }
  return labels[operation] ?? operation
}

function getAlertTypeLabel(alertType: string): string {
  const labels: Record<string, string> = {
    failure: '失败',
    slow: '慢响应',
    high_token: '高 Token',
  }
  return labels[alertType] ?? alertType
}

function getAlertTypeColor(alertType: string): string {
  const colors: Record<string, string> = {
    failure: '#f56c6c',
    slow: '#e6a23c',
    high_token: '#409eff',
  }
  return colors[alertType] ?? '#909399'
}

// ---- Data Loading ----

async function loadData(): Promise<void> {
  loading.value = true
  try {
    const [summaryData, statsData, recentData, alertsData] = await Promise.all([
      getMonitorSummary(selectedHours.value),
      getMonitorStats(),
      getMonitorRecent({ limit: 100 }),
      getMonitorAlerts({ limit: 20 }),
    ])

    summary.value = summaryData
    stats.value = statsData
    recentMetrics.value = recentData
    alerts.value = alertsData
  } catch (err) {
    message.error('加载监控数据失败')
    console.error('Failed to load monitor data:', err)
  } finally {
    loading.value = false
  }
}

async function handleRefresh(): Promise<void> {
  await loadData()
  message.success('数据已刷新')
}

function handleTimeRangeChange(val: string | number | boolean): void {
  selectedHours.value = val as number
  loadData()
}

function handleMetricFilterChange(agent?: string, status?: 'success' | 'failed'): void {
  selectedAgent.value = agent ?? ''
  // status filtering is handled by the component
}

function handleMetricPageChange(page: number): void {
  // Pagination is handled by the component
}

function handleAlertPageChange(page: number): void {
  // Pagination is handled by the component
}

function startAutoRefresh(): void {
  stopAutoRefresh()
  refreshTimer = setInterval(loadData, AUTO_REFRESH_INTERVAL)
}

function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// ---- Lifecycle ----

onMounted(() => {
  loadData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div :class="$style.page">
    <!-- 顶栏 -->
    <div :class="$style.topbar">
      <div :class="$style.topbarLeft">
        <div :class="$style.topbarLogo">
          <div :class="$style.topbarIcon">📊</div>
          <span :class="$style.topbarBrand">Agent 性能监控</span>
        </div>
      </div>
      <div :class="$style.topbarRight">
        <el-select
          v-model="selectedAgent"
          placeholder="所有 Agent"
          clearable
          size="small"
          :class="$style.filterSelect"
        >
          <el-option
            v-for="name in agentNames"
            :key="name"
            :label="getAgentLabel(name)"
            :value="name"
          />
        </el-select>
        <el-select
          v-model="selectedOperation"
          placeholder="所有操作"
          clearable
          size="small"
          :class="$style.filterSelect"
        >
          <el-option
            v-for="op in operations"
            :key="op"
            :label="getOperationLabel(op)"
            :value="op"
          />
        </el-select>
        <el-button
          type="primary"
          size="small"
          :loading="loading"
          @click="handleRefresh"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 主体 -->
    <div :class="$style.body">
      <!-- 时间范围选择 -->
      <div :class="$style.timeRange">
        <span :class="$style.timeLabel">时间范围：</span>
        <el-radio-group
          v-model="selectedHours"
          size="small"
          @change="handleTimeRangeChange"
        >
          <el-radio-button :value="1">1 小时</el-radio-button>
          <el-radio-button :value="6">6 小时</el-radio-button>
          <el-radio-button :value="24">24 小时</el-radio-button>
          <el-radio-button :value="72">3 天</el-radio-button>
          <el-radio-button :value="168">7 天</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 总览卡片 -->
      <MonitorSummaryCard :summary="summary" />

      <!-- Agent 分布 -->
      <div :class="$style.section">
        <AgentDistribution :distribution="agentDistribution" />
      </div>

      <!-- 详细统计表格 -->
      <div :class="$style.section">
        <h3 :class="$style.sectionTitle">Agent 统计</h3>
        <el-table
          :data="filteredStats"
          :class="$style.table"
          stripe
          size="small"
        >
          <el-table-column label="Agent" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.agentName === 'editor' ? 'primary' : row.agentName === 'flow' ? 'success' : 'info'">
                {{ getAgentLabel(row.agentName) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              {{ getOperationLabel(row.operation) }}
            </template>
          </el-table-column>
          <el-table-column label="调用次数" prop="totalCalls" width="100" sortable />
          <el-table-column label="成功率" width="100" sortable>
            <template #default="{ row }">
              <span :class="row.successRate >= 95 ? 'text-success' : 'text-warning'">
                {{ row.successRate }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column label="平均耗时" width="120" sortable>
            <template #default="{ row }">
              {{ formatDuration(row.avgDuration) }}
            </template>
          </el-table-column>
          <el-table-column label="P95 耗时" width="120" sortable>
            <template #default="{ row }">
              {{ formatDuration(row.p95Duration) }}
            </template>
          </el-table-column>
          <el-table-column label="最大耗时" width="120" sortable>
            <template #default="{ row }">
              {{ formatDuration(row.maxDuration) }}
            </template>
          </el-table-column>
          <el-table-column label="Token 消耗" width="120" sortable>
            <template #default="{ row }">
              {{ formatTokens(row.totalTokens) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 性能告警 -->
      <div :class="$style.section">
        <AlertList
          :alerts="alerts"
          :total="alerts.length"
          :current-page="1"
          :page-size="20"
          @page-change="handleAlertPageChange"
        />
      </div>

      <!-- 最近调用记录 -->
      <div :class="$style.section">
        <h3 :class="$style.sectionTitle">最近调用</h3>
        <el-table
          :data="filteredRecent"
          :class="$style.table"
          stripe
          size="small"
          max-height="400"
        >
          <el-table-column label="时间" width="100">
            <template #default="{ row }">
              {{ formatTime(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="Agent" width="80">
            <template #default="{ row }">
              {{ getAgentLabel(row.agentName) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              {{ getOperationLabel(row.operation) }}
            </template>
          </el-table-column>
          <el-table-column label="耗时" width="100" sortable>
            <template #default="{ row }">
              {{ formatDuration(row.duration) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                {{ row.success ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="错误" min-width="200">
            <template #default="{ row }">
              <span v-if="row.error" class="text-danger">{{ row.error }}</span>
              <span v-else class="text-secondary">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style module>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--el-bg-color-page, #f5f7fa);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--el-bg-color, #fff);
  border-bottom: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.topbarLeft {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbarLogo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbarIcon {
  font-size: 20px;
}

.topbarBrand {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.topbarRight {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filterSelect {
  width: 140px;
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.timeRange {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.timeLabel {
  font-size: 14px;
  color: var(--el-text-color-secondary, #606266);
}

.section {
  background: var(--el-bg-color, #fff);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  margin: 0 0 16px 0;
}

.table {
  width: 100%;
}

:global(.text-success) {
  color: var(--el-color-success, #67c23a);
}

:global(.text-warning) {
  color: var(--el-color-warning, #e6a23c);
}

:global(.text-danger) {
  color: var(--el-color-danger, #f56c6c);
}

:global(.text-secondary) {
  color: var(--el-text-color-secondary, #909399);
}
</style>
