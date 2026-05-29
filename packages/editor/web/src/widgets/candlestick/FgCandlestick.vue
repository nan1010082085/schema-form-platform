<script setup lang="ts">
import { inject, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { widgetDataKey } from '../base/types'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { echarts, type EChartsType } from '../base/echarts'

const widgetData = inject(widgetDataKey)!

function buildOption(data: Record<string, unknown>[], props: Record<string, unknown>): Record<string, unknown> {
  const dateField = (props.dateField as string) || 'date'
  const openField = (props.openField as string) || 'open'
  const closeField = (props.closeField as string) || 'close'
  const lowField = (props.lowField as string) || 'low'
  const highField = (props.highField as string) || 'high'
  const title = props.title as string
  const showLegend = props.showLegend !== false
  const colorScheme = (props.colorScheme as string) || 'default'

  const dates = data.map(item => item[dateField] as string)
  const seriesData = data.map(item => [
    Number(item[openField]) || 0,
    Number(item[closeField]) || 0,
    Number(item[lowField]) || 0,
    Number(item[highField]) || 0,
  ])

  const colorMap: Record<string, string[]> = {
    default: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
    dark: ['#dd6b66', '#759aa0', '#e69d87', '#8dc1a9', '#ea7e53', '#73a373', '#73b9bc', '#7289ab', '#91ca8c'],
    light: ['#37A2DA', '#32C5E9', '#67E0E3', '#9FE6B8', '#FFDB5C', '#ff9f7f', '#fb7293', '#E690D1', '#e7bcf3'],
  }

  const colors = colorMap[colorScheme] || colorMap.default

  return {
    color: colors,
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: showLegend ? { bottom: 0, data: ['K 线'] } : undefined,
    grid: { left: '3%', right: '4%', bottom: showLegend ? '12%' : '3%', containLabel: true },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', scale: true },
    series: [{
      name: 'K 线',
      type: 'candlestick',
      data: seriesData,
    }],
  }
}

const { chartOption, loading, chartData } = useChartOption({
  widgetData,
  buildOption,
})

useExposeWidget(() => ({
  get loading() { return loading.value },
  get chartData() { return chartData.value },
}))

const chartRef = ref<HTMLDivElement>()
let chartInstance: EChartsType | null = null

function initChart() {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)
  if (chartOption.value && Object.keys(chartOption.value).length > 0) {
    chartInstance.setOption(chartOption.value)
  }
}

function handleResize() {
  chartInstance?.resize()
}

watch(chartOption, async (option) => {
  if (!chartInstance) {
    await nextTick()
    initChart()
  }
  if (chartInstance && Object.keys(option).length > 0) {
    chartInstance.setOption(option, true)
  }
})

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<template>
  <div ref="chartRef" :class="$style.container" />
</template>

<style module>
.container {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
