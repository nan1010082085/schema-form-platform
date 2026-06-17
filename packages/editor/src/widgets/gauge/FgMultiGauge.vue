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
  const valueField = (props.valueField as string) || 'value'
  const nameField = (props.nameField as string) || 'name'
  const min = (props.min as number) ?? 0
  const max = (props.max as number) ?? 100
  const unit = (props.unit as string) || '%'
  const title = props.title as string
  const showLabel = props.showLabel !== false
  const animation = props.animation !== false
  const colorScheme = (props.colorScheme as string) || 'default'
  const customColors = props.customColors as string[] | undefined

  const colorMap: Record<string, string[]> = {
    default: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'],
    dark: ['#dd6b66', '#759aa0', '#e69d87', '#8dc1a9', '#ea7e53'],
    light: ['#37A2DA', '#32C5E9', '#67E0E3', '#9FE6B8', '#FFDB5C'],
  }

  const colors = customColors && customColors.length > 0 ? customColors : (colorMap[colorScheme] || colorMap.default)

  const gaugeSeries = data.map((item, idx) => ({
    name: item[nameField] as string,
    type: 'gauge' as const,
    center: [`${15 + idx * 35}%`, '55%'],
    radius: '60%',
    min,
    max,
    progress: { show: true, width: 12 },
    axisLine: { lineStyle: { width: 12 } },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    pointer: { show: false },
    anchor: { show: false },
    title: { show: showLabel, offsetCenter: [0, '70%'], fontSize: 12 },
    detail: {
      valueAnimation: true,
      fontSize: 18,
      fontWeight: 'bold',
      offsetCenter: [0, '40%'],
      formatter: `{value}${unit}`,
    },
    itemStyle: { color: colors[idx % colors.length] },
    data: [{ value: item[valueField] as number, name: item[nameField] as string }],
  }))

  return {
    title: title ? { text: title, left: 'center', top: 10 } : undefined,
    animation,
    series: gaugeSeries,
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
