<script setup lang="ts">
import { inject, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { widgetDataKey } from '../base/types'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { echarts, type EChartsType } from '../base/echarts'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

function buildOption(data: Record<string, unknown>[], props: Record<string, unknown>): Record<string, unknown> {
  const xField = (props.xField as string) || 'x'
  const yField = (props.yField as string) || 'y'
  const valueField = (props.valueField as string) || 'value'
  const title = props.title as string
  const showLabel = props.showLabel === true
  const colorScheme = (props.colorScheme as string) || 'default'

  const xSet = new Set<string | number>()
  const ySet = new Set<string | number>()
  for (const item of data) {
    xSet.add(item[xField] as string | number)
    ySet.add(item[yField] as string | number)
  }
  const xData = [...xSet]
  const yData = [...ySet]

  const seriesData = data.map(item => [item[xField], item[yField], item[valueField]])

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
      position: 'top',
    },
    grid: { left: '3%', right: '10%', bottom: '10%', containLabel: true },
    xAxis: { type: 'category', data: xData, splitArea: { show: true } },
    yAxis: { type: 'category', data: yData, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: Math.max(...data.map(item => Number(item[valueField]) || 0)),
      calculable: true,
      orient: 'vertical',
      right: '2%',
      bottom: '10%',
    },
    series: [{
      type: 'heatmap',
      data: seriesData,
      label: showLabel ? { show: true } : undefined,
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' },
      },
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
  <div ref="chartRef" :class="styles.container" />
</template>
