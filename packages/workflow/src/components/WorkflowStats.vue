<script setup lang="ts">
/**
 * WorkflowStats — 执行统计图表
 *
 * 使用原生 ECharts 展示执行趋势、成功率、平均耗时、热门工作流。
 */
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiClient } from '@schema-form/shared-utils/apiClient'
import * as echarts from 'echarts'
import styles from './WorkflowStats.module.scss'

// ── Types ──
interface StatsData {
  total: number
  completed: number
  failed: number
  successRate: number
  avgDurationSec: number
  statusBreakdown: Record<string, number>
  dailyTrend: Array<{
    date: string
    running: number
    completed: number
    failed: number
    terminated: number
    suspended: number
  }>
  hotWorkflows: Array<{ id: string; name: string; count: number }>
}

// ── State ──
const loading = ref(false)
const days = ref(7)
const stats = ref<StatsData | null>(null)

// Chart refs
const trendEl = ref<HTMLElement>()
const pieEl = ref<HTMLElement>()
const barEl = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null

// ── Fetch ──
async function fetchStats() {
  loading.value = true
  try {
    stats.value = await apiClient.get<StatsData>('/workflow-executions/stats', { days: String(days.value) })
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载统计失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  trendChart?.dispose()
  pieChart?.dispose()
  barChart?.dispose()
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  trendChart?.resize()
  pieChart?.resize()
  barChart?.resize()
}

function handleDaysChange(val: number) {
  days.value = val
  fetchStats()
}

// ── Chart rendering ──
watch(stats, (data) => {
  if (!data) return
  // Wait for DOM update
  setTimeout(() => {
    renderTrendChart(data)
    renderPieChart(data)
    renderBarChart(data)
  }, 50)
})

function renderTrendChart(data: StatsData) {
  if (!trendEl.value) return
  if (!trendChart) trendChart = echarts.init(trendEl.value)
  const dates = data.dailyTrend.map((d) => d.date)
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['已完成', '失败', '运行中'], bottom: 0 },
    grid: { left: 40, right: 20, top: 16, bottom: 40 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '已完成', type: 'line', smooth: true, data: data.dailyTrend.map((d) => d.completed), itemStyle: { color: '#67c23a' } },
      { name: '失败', type: 'line', smooth: true, data: data.dailyTrend.map((d) => d.failed), itemStyle: { color: '#f56c6c' } },
      { name: '运行中', type: 'line', smooth: true, data: data.dailyTrend.map((d) => d.running), itemStyle: { color: '#409eff' } },
    ],
  })
}

function renderPieChart(data: StatsData) {
  if (!pieEl.value) return
  if (!pieChart) pieChart = echarts.init(pieEl.value)
  const labelMap: Record<string, string> = {
    running: '运行中', completed: '已完成', failed: '失败', terminated: '已终止', suspended: '已挂起',
  }
  const colorMap: Record<string, string> = {
    '运行中': '#409eff', '已完成': '#67c23a', '失败': '#f56c6c', '已终止': '#e6a23c', '已挂起': '#909399',
  }
  const pieData = Object.entries(data.statusBreakdown).map(([name, value]) => ({
    name: labelMap[name] ?? name,
    value,
  }))
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '45%'],
      data: pieData,
      label: { show: true, formatter: '{b}\n{d}%' },
      itemStyle: {
        color: (params: { name: string }) => colorMap[params.name] ?? '#c0c4cc',
      },
    }],
  })
}

function renderBarChart(data: StatsData) {
  if (!barEl.value || data.hotWorkflows.length === 0) return
  if (!barChart) barChart = echarts.init(barEl.value)
  const names = data.hotWorkflows.map((w) => w.name)
  const counts = data.hotWorkflows.map((w) => w.count)
  barChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 20, right: 20, top: 16, bottom: 16, containLabel: true },
    xAxis: { type: 'category', data: names, axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{
      type: 'bar',
      data: counts,
      itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] },
    }],
  })
}
</script>

<template>
  <div :class="styles.root">
    <!-- Period selector -->
    <div :class="styles.periodBar">
      <span :class="styles.periodLabel">统计周期：</span>
      <el-radio-group v-model="days" size="small" @change="handleDaysChange">
        <el-radio-button :value="7">近 7 天</el-radio-button>
        <el-radio-button :value="14">近 14 天</el-radio-button>
        <el-radio-button :value="30">近 30 天</el-radio-button>
      </el-radio-group>
    </div>

    <el-skeleton v-if="loading && !stats" :rows="12" animated />

    <template v-else-if="stats">
      <!-- Summary cards -->
      <div :class="styles.summaryGrid">
        <div :class="styles.summaryCard">
          <div :class="styles.summaryValue">{{ stats.total }}</div>
          <div :class="styles.summaryLabel">总执行次数</div>
        </div>
        <div :class="styles.summaryCard">
          <div :class="[styles.summaryValue, styles.successColor]">{{ stats.successRate }}%</div>
          <div :class="styles.summaryLabel">成功率</div>
        </div>
        <div :class="styles.summaryCard">
          <div :class="styles.summaryValue">{{ stats.avgDurationSec }}s</div>
          <div :class="styles.summaryLabel">平均执行时间</div>
        </div>
        <div :class="styles.summaryCard">
          <div :class="[styles.summaryValue, styles.dangerColor]">{{ stats.failed }}</div>
          <div :class="styles.summaryLabel">失败次数</div>
        </div>
      </div>

      <!-- Charts -->
      <div :class="styles.chartGrid">
        <div :class="styles.chartCard">
          <h3 :class="styles.chartTitle">执行趋势</h3>
          <div ref="trendEl" :class="styles.chart"></div>
        </div>
        <div :class="styles.chartCard">
          <h3 :class="styles.chartTitle">状态分布</h3>
          <div ref="pieEl" :class="styles.chart"></div>
        </div>
      </div>

      <!-- Hot workflows -->
      <div v-if="stats.hotWorkflows.length > 0" :class="styles.chartCard">
        <h3 :class="styles.chartTitle">热门工作流 (Top {{ stats.hotWorkflows.length }})</h3>
        <div ref="barEl" :class="styles.chartTall"></div>
      </div>
    </template>
  </div>
</template>
