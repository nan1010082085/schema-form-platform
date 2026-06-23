<script setup lang="ts">
import { inject, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { widgetDataKey } from '../base/types'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { useChartLazyInit } from '../base/useChartLazyInit'
import { echarts, type EChartsType } from '../base/echarts'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

function buildOption(data: Record<string, unknown>[], props: Record<string, unknown>): Record<string, unknown> {
  const xField = (props.xField as string) || 'x'
  const yField = (props.yField as string) || 'y'
  const sizeField = (props.sizeField as string) || 'size'
  const title = props.title as string
  const showTooltip = props.showTooltip !== false
  const showLabel = props.showLabel === true
  const animation = props.animation !== false
  const colorScheme = (props.colorScheme as string) || 'default'
  const customColors = props.customColors as string[] | undefined

  const scatterData = data.map(item => [item[xField], item[yField], item[sizeField]])

  const colorMap: Record<string, string[]> = {
    default: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
    dark: ['#dd6b66', '#759aa0', '#e69d87', '#8dc1a9', '#ea7e53', '#73a373', '#73b9bc', '#7289ab', '#91ca8c'],
    light: ['#37A2DA', '#32C5E9', '#67E0E3', '#9FE6B8', '#FFDB5C', '#ff9f7f', '#fb7293', '#E690D1', '#e7bcf3'],
  }

  const colors = customColors && customColors.length > 0 ? customColors : (colorMap[colorScheme] || colorMap.default)

  return {
    color: colors,
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: showTooltip ? { trigger: 'item', formatter: (params: any) => `X: ${params.value[0]}<br/>Y: ${params.value[1]}<br/>大小: ${params.value[2]}` } : undefined,
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', name: props.xAxisName as string || undefined },
    yAxis: { type: 'value', name: props.yAxisName as string || undefined },
    animation,
    series: [{
      type: 'scatter',
      symbolSize: (val: number[]) => val[2],
      data: scatterData,
      label: showLabel ? { show: true, position: 'right' } : undefined,
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
let resizeObserver: ResizeObserver | null = null

const { isVisible } = useChartLazyInit(chartRef)

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

watch(isVisible, (visible) => {
  if (visible) {
    nextTick(() => initChart())
  }
})

watch(chartOption, async (option) => {
  if (!isVisible.value) return
  if (!chartInstance) {
    await nextTick()
    initChart()
  }
  if (chartInstance && Object.keys(option).length > 0) {
    chartInstance.setOption(option, true)
  }
})

onMounted(() => {
  if (isVisible.value) {
    initChart()
  }
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(chartRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<template>
  <div ref="chartRef" :class="styles.container" />
</template>
