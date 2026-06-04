import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  FlowMonitorStats,
  FlowMonitorNodeStat,
  FlowMonitorTrendPoint,
} from '@schema-form/flow-shared'
import { flowApi } from '../api/flowApi.js'

export const useFlowMonitorStore = defineStore('flowMonitor', () => {
  const stats = ref<FlowMonitorStats>({
    total: 0,
    running: 0,
    completed: 0,
    terminated: 0,
    suspended: 0,
    failed: 0,
  })
  const avgDuration = ref(0)
  const nodeStats = ref<FlowMonitorNodeStat[]>([])
  const trend = ref<FlowMonitorTrendPoint[]>([])
  const loading = ref(false)

  async function fetchDashboard(days = 30) {
    loading.value = true
    try {
      const [statsData, durationData, nodeData, trendData] = await Promise.all([
        flowApi.getMonitorStats(),
        flowApi.getMonitorAvgDuration(),
        flowApi.getMonitorNodeStats(),
        flowApi.getMonitorTrend(days),
      ])
      stats.value = statsData
      avgDuration.value = durationData.avgDuration
      nodeStats.value = nodeData
      trend.value = trendData
    } finally {
      loading.value = false
    }
  }

  return {
    stats,
    avgDuration,
    nodeStats,
    trend,
    loading,
    fetchDashboard,
  }
})
