<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as echarts from 'echarts'
import type { DashboardStats } from '@/types/home'

const props = defineProps<{
  stats: DashboardStats
}>()

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const placeholderData = computed(() => {
  const { schemas, flows, ai } = props.stats
  return {
    schemasTotal: schemas.published + schemas.draft,
    flowsTotal: flows.running + flows.completed,
    aiTotal: ai.total,
  }
})

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chart) return

  const { schemas, flows, ai } = props.stats
  const { schemasTotal, flowsTotal, aiTotal } = placeholderData.value

  // 没有数据时显示占位环形图
  const placeholderColor = '#f0f0f0'
  const placeholderStyle = { color: placeholderColor }

  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        fontSize: 12,
        color: '#666',
      },
    },
    series: [
      {
        name: '表单状态',
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['15%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' },
        },
        data: schemasTotal > 0
          ? [
              { value: schemas.published, name: '已发布', itemStyle: { color: '#667eea' } },
              { value: schemas.draft, name: '草稿', itemStyle: { color: '#e0e7ff' } },
            ]
          : [{ value: 1, name: '暂无数据', itemStyle: placeholderStyle }],
      },
      {
        name: '流程状态',
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['40%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' },
        },
        data: flowsTotal > 0
          ? [
              { value: flows.running, name: '运行中', itemStyle: { color: '#f093fb' } },
              { value: flows.completed, name: '已完成', itemStyle: { color: '#fce7f3' } },
            ]
          : [{ value: 1, name: '暂无数据', itemStyle: placeholderStyle }],
      },
      {
        name: 'AI 对话',
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['65%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' },
        },
        data: aiTotal > 0
          ? [
              { value: Math.round(ai.successRate * 100), name: '成功率', itemStyle: { color: '#4facfe' } },
              { value: Math.round((1 - ai.successRate) * 100), name: '失败率', itemStyle: { color: '#e0f2fe' } },
            ]
          : [{ value: 1, name: '暂无数据', itemStyle: placeholderStyle }],
      },
      {
        name: 'Token 用量',
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['90%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' },
        },
        data: ai.tokenUsage > 0
          ? [{ value: ai.tokenUsage, name: 'Token', itemStyle: { color: '#43e97b' } }]
          : [{ value: 1, name: '暂无数据', itemStyle: placeholderStyle }],
      },
    ],
  })
}

function handleResize() {
  chart?.resize()
}

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
  <div ref="chartRef" :class="$style.chart"></div>
</template>

<style module>
.chart {
  width: 100%;
  height: 200px;
}
</style>
