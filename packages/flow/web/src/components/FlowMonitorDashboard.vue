<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { Refresh } from '@element-plus/icons-vue'
import { useFlowMonitorStore } from '../stores/flowMonitor.js'
import styles from './FlowMonitorDashboard.module.scss'

const store = useFlowMonitorStore()

const statusChartRef = ref<HTMLDivElement>()
const trendChartRef = ref<HTMLDivElement>()
const nodeChartRef = ref<HTMLDivElement>()
const topFlowChartRef = ref<HTMLDivElement>()

let statusChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null
let nodeChart: echarts.ECharts | null = null
let topFlowChart: echarts.ECharts | null = null

let refreshTimer: ReturnType<typeof setInterval> | null = null

const REFRESH_INTERVAL = 30_000

function formatDuration(ms: number): string {
  if (ms <= 0) return '-'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  if (hours < 24) return `${hours} 小时 ${remainMinutes} 分钟`
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return `${days} 天 ${remainHours} 小时`
}

// ---- Status Pie Chart ----
function initStatusChart() {
  if (!statusChartRef.value) return
  statusChart = echarts.init(statusChartRef.value)
  updateStatusChart()
}

function updateStatusChart() {
  if (!statusChart) return
  const { running, completed, terminated, suspended, failed } = store.stats
  statusChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{c}' },
        data: [
          { value: running, name: '运行中', itemStyle: { color: '#409eff' } },
          { value: completed, name: '已完成', itemStyle: { color: '#67c23a' } },
          { value: terminated, name: '已终止', itemStyle: { color: '#909399' } },
          { value: suspended, name: '已挂起', itemStyle: { color: '#e6a23c' } },
          { value: failed, name: '已失败', itemStyle: { color: '#f56c6c' } },
        ].filter((d) => d.value > 0),
      },
    ],
  })
}

// ---- Daily Trend Line Chart ----
function initTrendChart() {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChart) return
  const dates = store.trend.map((p) => p.date)
  const counts = store.trend.map((p) => p.count)

  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLabel: {
        rotate: dates.length > 15 ? 45 : 0,
        formatter: (val: string) => val.slice(5),
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      name: '实例数',
    },
    series: [
      {
        name: '新建实例',
        type: 'line',
        data: counts,
        smooth: true,
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#409eff' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  })
}

// ---- Node Avg Duration Bar Chart ----
function initNodeChart() {
  if (!nodeChartRef.value) return
  nodeChart = echarts.init(nodeChartRef.value)
  updateNodeChart()
}

function updateNodeChart() {
  if (!nodeChart) return
  const sorted = [...store.nodeStats].sort((a, b) => b.avgDuration - a.avgDuration).slice(0, 10)
  const names = sorted.map((n) => n.nodeName || n.nodeId)
  const durations = sorted.map((n) => n.avgDuration)

  nodeChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const list = params as Array<{ axisValue: string; value: number; marker: string }>
        const item = list[0]
        if (!item) return ''
        return `${item.marker} ${item.axisValue}<br/>平均耗时: ${formatDuration(item.value)}`
      },
    },
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { rotate: names.length > 6 ? 30 : 0 },
    },
    yAxis: {
      type: 'value',
      name: '耗时',
      axisLabel: {
        formatter: (val: number) => {
          if (val >= 3600000) return `${(val / 3600000).toFixed(1)}h`
          if (val >= 60000) return `${(val / 60000).toFixed(0)}m`
          return `${(val / 1000).toFixed(0)}s`
        },
      },
    },
    series: [
      {
        type: 'bar',
        data: durations,
        itemStyle: { color: '#67c23a', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 40,
      },
    ],
  })
}

// ---- Top Flows Horizontal Bar Chart ----
function initTopFlowChart() {
  if (!topFlowChartRef.value) return
  topFlowChart = echarts.init(topFlowChartRef.value)
  updateTopFlowChart()
}

function updateTopFlowChart() {
  if (!topFlowChart) return
  const sorted = [...store.topFlows].reverse()
  const names = sorted.map((f) => f.flowName)
  const counts = sorted.map((f) => f.count)

  topFlowChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 120, right: 30, top: 20, bottom: 20 },
    xAxis: {
      type: 'value',
      minInterval: 1,
      name: '实例数',
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        width: 100,
        overflow: 'truncate',
        ellipsis: '...',
      },
    },
    series: [
      {
        type: 'bar',
        data: counts,
        itemStyle: { color: '#409eff', borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 28,
        label: { show: true, position: 'right', formatter: '{c}' },
      },
    ],
  })
}

// ---- Lifecycle ----
function handleResize() {
  statusChart?.resize()
  trendChart?.resize()
  nodeChart?.resize()
  topFlowChart?.resize()
}

function disposeCharts() {
  statusChart?.dispose()
  trendChart?.dispose()
  nodeChart?.dispose()
  topFlowChart?.dispose()
  statusChart = null
  trendChart = null
  nodeChart = null
  topFlowChart = null
}

function startAutoRefresh() {
  refreshTimer = setInterval(() => {
    store.fetchDashboard()
  }, REFRESH_INTERVAL)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function handleManualRefresh() {
  await store.fetchDashboard()
}

watch(
  () => [store.stats, store.trend, store.nodeStats, store.topFlows],
  () => {
    updateStatusChart()
    updateTrendChart()
    updateNodeChart()
    updateTopFlowChart()
  },
  { deep: true },
)

onMounted(async () => {
  await store.fetchDashboard()
  await nextTick()
  initStatusChart()
  initTrendChart()
  initNodeChart()
  initTopFlowChart()
  window.addEventListener('resize', handleResize)
  startAutoRefresh()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  stopAutoRefresh()
  disposeCharts()
})
</script>

<template>
  <div :class="styles.dashboard" v-loading="store.loading">
    <div :class="styles.header">
      <h2 :class="styles.title">流程监控仪表盘</h2>
      <el-button :icon="Refresh" circle @click="handleManualRefresh" :loading="store.loading" data-test="refresh-btn" />
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" :class="styles.statsRow">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" :class="styles.statCard">
          <div :class="styles.statItem">
            <div :class="[styles.statValue, styles.statTotal]">{{ store.stats.total }}</div>
            <div :class="styles.statLabel">总实例数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" :class="styles.statCard">
          <div :class="styles.statItem">
            <div :class="[styles.statValue, styles.statRunning]">{{ store.stats.running }}</div>
            <div :class="styles.statLabel">运行中</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" :class="styles.statCard">
          <div :class="styles.statItem">
            <div :class="[styles.statValue, styles.statToday]">{{ store.todayNew }}</div>
            <div :class="styles.statLabel">今日新增</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" :class="styles.statCard">
          <div :class="styles.statItem">
            <div :class="[styles.statValue, styles.statDuration]">{{ formatDuration(store.avgDuration) }}</div>
            <div :class="styles.statLabel">平均处理时长</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表第一行: 状态分布 + 每日趋势 -->
    <el-row :gutter="16" :class="styles.chartRow">
      <el-col :xs="24" :md="10">
        <el-card shadow="hover">
          <template #header>
            <span>流程实例状态分布</span>
          </template>
          <div ref="statusChartRef" :class="styles.chart"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="14">
        <el-card shadow="hover">
          <template #header>
            <span>每日实例数量趋势</span>
          </template>
          <div ref="trendChartRef" :class="styles.chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表第二行: 节点耗时 + 热门流程 -->
    <el-row :gutter="16" :class="styles.chartRow">
      <el-col :xs="24" :md="12">
        <el-card shadow="hover">
          <template #header>
            <span>节点平均处理时间</span>
          </template>
          <div ref="nodeChartRef" :class="styles.chart"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card shadow="hover">
          <template #header>
            <span>热门流程 Top 5</span>
          </template>
          <div ref="topFlowChartRef" :class="styles.chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
