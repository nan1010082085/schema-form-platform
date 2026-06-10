import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  FlowMonitorStatsWithPercent,
  FlowMonitorNodeStat,
  FlowMonitorTrendPoint,
  FlowMonitorTopFlow,
  FlowMonitorTimeRange,
  TimeRangePreset,
} from '@schema-form/flow-shared'
import { flowApi } from '../api/flowApi.js'

export const useFlowMonitorStore = defineStore('flowMonitor', () => {
  const stats = ref<FlowMonitorStatsWithPercent>({
    total: 0,
    running: 0,
    completed: 0,
    terminated: 0,
    suspended: 0,
    failed: 0,
    runningPct: 0,
    completedPct: 0,
    terminatedPct: 0,
    suspendedPct: 0,
    failedPct: 0,
  })
  const avgDuration = ref(0)
  const nodeStats = ref<FlowMonitorNodeStat[]>([])
  const trend = ref<FlowMonitorTrendPoint[]>([])
  const topFlows = ref<FlowMonitorTopFlow[]>([])
  const loading = ref(false)

  const timeRange = ref<FlowMonitorTimeRange>({ preset: 'month' })

  const todayNew = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return trend.value.find((p) => p.date === today)?.count ?? 0
  })

  function setTimeRange(preset: TimeRangePreset, startDate?: string, endDate?: string) {
    timeRange.value = { preset, startDate, endDate }
    fetchDashboard()
  }

  async function fetchDashboard(days = 30) {
    loading.value = true
    try {
      const [statsData, durationData, nodeData, trendData, topFlowsData] = await Promise.all([
        flowApi.getMonitorStats(timeRange.value),
        flowApi.getMonitorAvgDuration(),
        flowApi.getMonitorNodeStats(),
        flowApi.getMonitorTrend(days, timeRange.value),
        flowApi.getMonitorTopFlows(5),
      ])
      stats.value = statsData
      avgDuration.value = durationData.avgDuration
      nodeStats.value = nodeData
      trend.value = trendData
      topFlows.value = topFlowsData
    } finally {
      loading.value = false
    }
  }

  return {
    stats,
    avgDuration,
    nodeStats,
    trend,
    topFlows,
    todayNew,
    loading,
    timeRange,
    setTimeRange,
    fetchDashboard,
  }
})
