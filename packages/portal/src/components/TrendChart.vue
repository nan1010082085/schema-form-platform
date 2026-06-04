<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { DashboardStats } from '@/types/home'

const props = defineProps<{
  stats: DashboardStats | null
}>()

type TimeRange = '7d' | '30d'

const chartRef = ref<HTMLDivElement>()
const timeRange = ref<TimeRange>('7d')
let chart: echarts.ECharts | null = null

// 模拟趋势数据（实际应从后端获取）
function generateTrendData(range: TimeRange) {
  const days = range === '7d' ? 7 : 30
  const dates: string[] = []
  const schemas: number[] = []
  const flows: number[] = []
  const aiConversations: number[] = []

  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`)

    // 基于当前统计生成趋势数据
    const baseSchemas = props.stats?.schemas.total ?? 10
    const baseFlows = props.stats?.flows.total ?? 5
    const baseAi = props.stats?.ai.total ?? 20

    const factor = 0.3 + Math.random() * 0.7
    schemas.push(Math.max(1, Math.round(baseSchemas * factor * 0.3)))
    flows.push(Math.max(0, Math.round(baseFlows * factor * 0.2)))
    aiConversations.push(Math.max(1, Math.round(baseAi * factor * 0.25)))
  }

  return { dates, schemas, flows, aiConversations }
}

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chart) return

  const { dates, schemas, flows, aiConversations } = generateTrendData(timeRange.value)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: {
        color: '#333',
        fontSize: 13,
      },
    },
    legend: {
      data: ['表单创建', '流程实例', 'AI 对话'],
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        fontSize: 12,
        color: '#666',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {
        lineStyle: { color: '#e0e0e0' },
      },
      axisLabel: {
        color: '#666',
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: '#f0f0f0', type: 'dashed' },
      },
      axisLabel: {
        color: '#999',
        fontSize: 11,
      },
    },
    series: [
      {
        name: '表单创建',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#667eea' },
        itemStyle: { color: '#667eea' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(102, 126, 234, 0.25)' },
            { offset: 1, color: 'rgba(102, 126, 234, 0.02)' },
          ]),
        },
        data: schemas,
      },
      {
        name: '流程实例',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#f093fb' },
        itemStyle: { color: '#f093fb' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(240, 147, 251, 0.25)' },
            { offset: 1, color: 'rgba(240, 147, 251, 0.02)' },
          ]),
        },
        data: flows,
      },
      {
        name: 'AI 对话',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#4facfe' },
        itemStyle: { color: '#4facfe' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(79, 172, 254, 0.25)' },
            { offset: 1, color: 'rgba(79, 172, 254, 0.02)' },
          ]),
        },
        data: aiConversations,
      },
    ],
  }, true)
}

function handleResize() {
  chart?.resize()
}

watch(timeRange, () => {
  updateChart()
})

watch(
  () => props.stats,
  () => updateChart(),
  { deep: true },
)

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">数据趋势</h3>
      <el-radio-group v-model="timeRange" size="small">
        <el-radio-button value="7d">近 7 天</el-radio-button>
        <el-radio-button value="30d">近 30 天</el-radio-button>
      </el-radio-group>
    </div>
    <div ref="chartRef" :class="$style.chart"></div>
  </div>
</template>

<style module>
.container {
  width: 100%;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.chart {
  width: 100%;
  height: 280px;
}
</style>
