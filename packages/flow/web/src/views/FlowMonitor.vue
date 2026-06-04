<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { useFlowMonitorStore } from '../stores/flowMonitor.js'
import styles from './FlowMonitor.module.scss'

const store = useFlowMonitorStore()

const stats = computed(() => store.stats)
const avgDuration = computed(() => store.avgDuration)
const nodeStats = computed(() => store.nodeStats)
const trend = computed(() => store.trend)
const loading = computed(() => store.loading)

const trendChartRef = ref<HTMLDivElement>()
const nodeChartRef = ref<HTMLDivElement>()
let trendChart: echarts.ECharts | null = null
let nodeChart: echarts.ECharts | null = null

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

function initTrendChart() {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChart) return
  const dates = trend.value.map((p) => p.date)
  const counts = trend.value.map((p) => p.count)

  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: dates,
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
        type: 'bar',
        data: counts,
        itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] },
      },
    ],
  })
}

function initNodeChart() {
  if (!nodeChartRef.value) return
  nodeChart = echarts.init(nodeChartRef.value)
  updateNodeChart()
}

function updateNodeChart() {
  if (!nodeChart) return
  const names = nodeStats.value.map((n) => n.nodeName || n.nodeId)
  const durations = nodeStats.value.map((n) => n.avgDuration)
  const counts = nodeStats.value.map((n) => n.count)

  nodeChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const list = params as Array<{ axisValue: string; seriesName: string; value: number; marker: string }>
        const name = list[0]?.axisValue ?? ''
        let html = `<div style="font-weight:600;margin-bottom:4px">${name}</div>`
        for (const item of list) {
          const val = item.seriesName === '平均耗时'
            ? formatDuration(item.value)
            : `${item.value} 次`
          html += `${item.marker} ${item.seriesName}: ${val}<br/>`
        }
        return html
      },
    },
    legend: { top: 4 },
    grid: { left: 50, right: 50, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { rotate: names.length > 6 ? 30 : 0 },
    },
    yAxis: [
      {
        type: 'value',
        name: '耗时(ms)',
        position: 'left',
      },
      {
        type: 'value',
        name: '次数',
        position: 'right',
        minInterval: 1,
      },
    ],
    series: [
      {
        name: '平均耗时',
        type: 'bar',
        data: durations,
        itemStyle: { color: '#67c23a', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '完成次数',
        type: 'line',
        yAxisIndex: 1,
        data: counts,
        itemStyle: { color: '#e6a23c' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  })
}

function handleResize() {
  trendChart?.resize()
  nodeChart?.resize()
}

onMounted(async () => {
  await store.fetchDashboard()
  await nextTick()
  initTrendChart()
  initNodeChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  nodeChart?.dispose()
})
</script>

<template>
  <div :class="styles.monitor" v-loading="loading">
    <div :class="styles.header">
      <h2>流程监控仪表盘</h2>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card shadow="hover" :class="styles.statCard">
          <div :class="styles.statItem">
            <div :class="[styles.statValue, styles.statTotal]">{{ stats.total }}</div>
            <div :class="styles.statLabel">流程总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" :class="styles.statCard">
          <div :class="styles.statItem">
            <div :class="[styles.statValue, styles.statRunning]">{{ stats.running }}</div>
            <div :class="styles.statLabel">运行中</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" :class="styles.statCard">
          <div :class="styles.statItem">
            <div :class="[styles.statValue, styles.statCompleted]">{{ stats.completed }}</div>
            <div :class="styles.statLabel">已完成</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" :class="styles.statCard">
          <div :class="styles.statItem">
            <div :class="[styles.statValue, styles.statFailed]">{{ stats.failed }}</div>
            <div :class="styles.statLabel">失败</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 平均时长卡片 -->
    <el-row :gutter="16" :class="styles.avgRow">
      <el-col :span="24">
        <el-card shadow="hover">
          <div :class="styles.avgDuration">
            <span :class="styles.avgLabel">已完成流程平均时长</span>
            <span :class="styles.avgValue">{{ formatDuration(avgDuration) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="16" :class="styles.chartRow">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>近 30 天实例趋势</span>
          </template>
          <div ref="trendChartRef" :class="styles.chart"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>节点耗时分布</span>
          </template>
          <div ref="nodeChartRef" :class="styles.chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
