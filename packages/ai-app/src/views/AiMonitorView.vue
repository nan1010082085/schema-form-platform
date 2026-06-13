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

import { ref, onMounted, computed } from 'vue'
import { message } from '@schema-form/shared-utils/message'
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

// ---- State ----

const loading = ref(false)
const summary = ref<MonitorSummary | null>(null)
const stats = ref<AgentMetricStats[]>([])
const recentMetrics = ref<AgentMetric[]>([])
const alerts = ref<AgentAlert[]>([])
const selectedHours = ref(24)
const selectedAgent = ref<string>('')
const selectedOperation = ref<string>('')

// ---- Computed ----

const agentNames = computed(() => {
  const names = new Set(stats.value.map((s) => s.agentName))
  return Array.from(names).sort()
})

const operations = computed(() => {
  const ops = new Set(stats.value.map((s) => s.operation))
  return Array.from(ops).sort()
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
  getMonitorSummary(val as number).then((data) => {
    summary.value = data
  })
}

// ---- Lifecycle ----

onMounted(() => {
  loadData()
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
        <t-select
          v-model="selectedAgent"
          placeholder="所有 Agent"
          clearable
          size="small"
          :class="$style.filterSelect"
          :options="agentNames.map(name => ({ label: getAgentLabel(name), value: name }))"
        />
        <t-select
          v-model="selectedOperation"
          placeholder="所有操作"
          clearable
          size="small"
          :class="$style.filterSelect"
          :options="operations.map(op => ({ label: getOperationLabel(op), value: op }))"
        />
        <t-button
          theme="primary"
          size="small"
          :loading="loading"
          @click="handleRefresh"
        >
          刷新
        </t-button>
      </div>
    </div>

    <!-- 主体 -->
    <div :class="$style.body">
      <!-- 时间范围选择 -->
      <div :class="$style.timeRange">
        <span :class="$style.timeLabel">时间范围：</span>
        <t-radio-group
          v-model="selectedHours"
          size="small"
          @change="handleTimeRangeChange"
        >
          <t-radio-button :value="1">1 小时</t-radio-button>
          <t-radio-button :value="6">6 小时</t-radio-button>
          <t-radio-button :value="24">24 小时</t-radio-button>
          <t-radio-button :value="72">3 天</t-radio-button>
          <t-radio-button :value="168">7 天</t-radio-button>
        </t-radio-group>
      </div>

      <!-- 总览卡片 -->
      <div v-if="summary" :class="$style.summaryGrid">
        <div :class="$style.summaryCard">
          <div :class="$style.summaryLabel">总调用次数</div>
          <div :class="$style.summaryValue">{{ summary.totalCalls }}</div>
        </div>
        <div :class="$style.summaryCard">
          <div :class="$style.summaryLabel">成功率</div>
          <div :class="[$style.summaryValue, summary.successRate >= 95 ? $style.success : $style.warning]">
            {{ summary.successRate }}%
          </div>
        </div>
        <div :class="$style.summaryCard">
          <div :class="$style.summaryLabel">平均响应时间</div>
          <div :class="$style.summaryValue">{{ formatDuration(summary.avgDuration) }}</div>
        </div>
        <div :class="$style.summaryCard">
          <div :class="$style.summaryLabel">最大响应时间</div>
          <div :class="$style.summaryValue">{{ formatDuration(summary.maxDuration) }}</div>
        </div>
        <div :class="$style.summaryCard">
          <div :class="$style.summaryLabel">Token 消耗</div>
          <div :class="$style.summaryValue">{{ formatTokens(summary.totalTokens) }}</div>
        </div>
        <div :class="$style.summaryCard">
          <div :class="$style.summaryLabel">慢响应 (>10s)</div>
          <div :class="[$style.summaryValue, summary.slowCalls > 0 ? $style.warning : '']">
            {{ summary.slowCalls }}
          </div>
        </div>
      </div>

      <!-- 详细统计表格 -->
      <div :class="$style.section">
        <h3 :class="$style.sectionTitle">Agent 统计</h3>
        <t-table
          :data="filteredStats"
          :class="$style.table"
          stripe
          size="small"
          :columns="[
            { colKey: 'agentName', title: 'Agent', width: 100 },
            { colKey: 'operation', title: '操作', width: 80 },
            { colKey: 'totalCalls', title: '调用次数', width: 100, sorter: true },
            { colKey: 'successRate', title: '成功率', width: 100, sorter: true },
            { colKey: 'avgDuration', title: '平均耗时', width: 120, sorter: true },
            { colKey: 'p95Duration', title: 'P95 耗时', width: 120, sorter: true },
            { colKey: 'maxDuration', title: '最大耗时', width: 120, sorter: true },
            { colKey: 'totalTokens', title: 'Token 消耗', width: 120, sorter: true },
          ]"
        >
          <template #agentName="{ row }">
            <t-tag size="small" :theme="row.agentName === 'editor' ? 'primary' : row.agentName === 'flow' ? 'success' : 'default'">
              {{ getAgentLabel(row.agentName) }}
            </t-tag>
          </template>
          <template #operation="{ row }">
            {{ getOperationLabel(row.operation) }}
          </template>
          <template #successRate="{ row }">
            <span :class="row.successRate >= 95 ? $style.success : $style.warning">
              {{ row.successRate }}%
            </span>
          </template>
          <template #avgDuration="{ row }">
            {{ formatDuration(row.avgDuration) }}
          </template>
          <template #p95Duration="{ row }">
            {{ formatDuration(row.p95Duration) }}
          </template>
          <template #maxDuration="{ row }">
            {{ formatDuration(row.maxDuration) }}
          </template>
          <template #totalTokens="{ row }">
            {{ formatTokens(row.totalTokens) }}
          </template>
        </t-table>
      </div>

      <!-- 性能告警 -->
      <div v-if="alerts.length > 0" :class="$style.section">
        <h3 :class="$style.sectionTitle">性能告警</h3>
        <div :class="$style.alertsList">
          <div
            v-for="alert in alerts"
            :key="alert.id"
            :class="$style.alertItem"
          >
            <div :class="$style.alertHeader">
              <t-tag
                size="small"
                :style="{ background: getAlertTypeColor(alert.alertType), color: '#fff' }"
                variant="dark"
              >
                {{ getAlertTypeLabel(alert.alertType) }}
              </t-tag>
              <span :class="$style.alertAgent">{{ getAgentLabel(alert.agentName) }}</span>
              <span :class="$style.alertTime">{{ formatTime(alert.createdAt) }}</span>
            </div>
            <div :class="$style.alertDetail">
              <span>操作：{{ getOperationLabel(alert.operation) }}</span>
              <span>耗时：{{ formatDuration(alert.duration) }}</span>
              <span v-if="alert.tokenUsage?.total">
                Token：{{ formatTokens(alert.tokenUsage.total) }}
              </span>
              <span v-if="alert.error" :class="$style.alertError">
                错误：{{ alert.error }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近调用记录 -->
      <div :class="$style.section">
        <h3 :class="$style.sectionTitle">最近调用</h3>
        <t-table
          :data="filteredRecent"
          :class="$style.table"
          stripe
          size="small"
          max-height="400"
          :columns="[
            { colKey: 'createdAt', title: '时间', width: 100 },
            { colKey: 'agentName', title: 'Agent', width: 80 },
            { colKey: 'operation', title: '操作', width: 80 },
            { colKey: 'duration', title: '耗时', width: 100, sorter: true },
            { colKey: 'success', title: '状态', width: 80 },
            { colKey: 'error', title: '错误', minWidth: 200 },
          ]"
        >
          <template #createdAt="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
          <template #agentName="{ row }">
            {{ getAgentLabel(row.agentName) }}
          </template>
          <template #operation="{ row }">
            {{ getOperationLabel(row.operation) }}
          </template>
          <template #duration="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
          <template #success="{ row }">
            <t-tag :theme="row.success ? 'success' : 'danger'" size="small">
              {{ row.success ? '成功' : '失败' }}
            </t-tag>
          </template>
          <template #error="{ row }">
            <span v-if="row.error" :class="$style.errorText">{{ row.error }}</span>
            <span v-else :class="$style.mutedText">-</span>
          </template>
        </t-table>
      </div>
    </div>
  </div>
</template>

<style module>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--td-bg-color-page, #f5f7fa);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--td-bg-color-container, #fff);
  border-bottom: 1px solid var(--td-border-level-2-color, #e4e7ed);
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
  color: var(--td-text-color-primary, #303133);
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
  color: var(--td-text-color-secondary, #606266);
}

.summaryGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summaryCard {
  background: var(--td-bg-color-container, #fff);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--td-shadow-1, 0 2px 12px 0 rgba(0, 0, 0, 0.06));
}

.summaryLabel {
  font-size: 12px;
  color: var(--td-text-color-placeholder, #909399);
  margin-bottom: 8px;
}

.summaryValue {
  font-size: 24px;
  font-weight: 600;
  color: var(--td-text-color-primary, #303133);
}

.success {
  color: var(--td-success-color, #67c23a);
}

.warning {
  color: var(--td-warning-color, #e6a23c);
}

.section {
  background: var(--td-bg-color-container, #fff);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: var(--td-shadow-1, 0 2px 12px 0 rgba(0, 0, 0, 0.06));
}

.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--td-text-color-primary, #303133);
  margin: 0 0 16px 0;
}

.table {
  width: 100%;
}

.alertsList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alertItem {
  background: var(--td-bg-color-secondarycontainer, #fafafa);
  border-radius: 6px;
  padding: 12px;
  border-left: 3px solid var(--td-warning-color, #e6a23c);
}

.alertHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.alertAgent {
  font-weight: 500;
  color: var(--td-text-color-primary, #303133);
}

.alertTime {
  margin-left: auto;
  font-size: 12px;
  color: var(--td-text-color-placeholder, #909399);
}

.alertDetail {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: var(--td-text-color-secondary, #606266);
}

.alertError {
  color: var(--td-error-color, #f56c6c);
}

.errorText {
  color: var(--td-error-color, #f56c6c);
  font-size: 12px;
}

.mutedText {
  color: var(--td-text-color-placeholder, #c0c4cc);
}
</style>
