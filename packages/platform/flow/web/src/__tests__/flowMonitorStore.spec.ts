import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowMonitorStore } from '../stores/flowMonitor'

vi.mock('../api/flowApi', () => ({
  flowApi: {
    getMonitorStats: vi.fn(),
    getMonitorAvgDuration: vi.fn(),
    getMonitorNodeStats: vi.fn(),
    getMonitorTrend: vi.fn(),
    getMonitorTopFlows: vi.fn(),
  },
}))

import { flowApi } from '../api/flowApi'

const mockFlowApi = vi.mocked(flowApi)

describe('useFlowMonitorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('has correct initial state', () => {
    const store = useFlowMonitorStore()
    expect(store.stats.total).toBe(0)
    expect(store.stats.running).toBe(0)
    expect(store.stats.completed).toBe(0)
    expect(store.stats.runningPct).toBe(0)
    expect(store.stats.completedPct).toBe(0)
    expect(store.avgDuration).toBe(0)
    expect(store.nodeStats).toEqual([])
    expect(store.trend).toEqual([])
    expect(store.topFlows).toEqual([])
    expect(store.todayNew).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.timeRange).toEqual({ preset: 'month' })
  })

  describe('todayNew', () => {
    it('returns count for today from trend data', () => {
      const store = useFlowMonitorStore()
      const today = new Date().toISOString().slice(0, 10)
      store.trend = [
        { date: '2026-01-01', count: 5 },
        { date: today, count: 12 },
      ]
      expect(store.todayNew).toBe(12)
    })

    it('returns 0 when today has no entry', () => {
      const store = useFlowMonitorStore()
      store.trend = [{ date: '2026-01-01', count: 5 }]
      expect(store.todayNew).toBe(0)
    })
  })

  describe('setTimeRange', () => {
    it('updates timeRange and triggers fetchDashboard', async () => {
      mockFlowApi.getMonitorStats.mockResolvedValue({} as any)
      mockFlowApi.getMonitorAvgDuration.mockResolvedValue({ avgDuration: 0 })
      mockFlowApi.getMonitorNodeStats.mockResolvedValue([])
      mockFlowApi.getMonitorTrend.mockResolvedValue([])
      mockFlowApi.getMonitorTopFlows.mockResolvedValue([])

      const store = useFlowMonitorStore()
      store.setTimeRange('week')

      expect(store.timeRange).toEqual({ preset: 'week' })
      // fetchDashboard is called internally
      await vi.waitFor(() => expect(mockFlowApi.getMonitorStats).toHaveBeenCalled())
    })

    it('supports custom date range', async () => {
      mockFlowApi.getMonitorStats.mockResolvedValue({} as any)
      mockFlowApi.getMonitorAvgDuration.mockResolvedValue({ avgDuration: 0 })
      mockFlowApi.getMonitorNodeStats.mockResolvedValue([])
      mockFlowApi.getMonitorTrend.mockResolvedValue([])
      mockFlowApi.getMonitorTopFlows.mockResolvedValue([])

      const store = useFlowMonitorStore()
      store.setTimeRange('custom', '2026-01-01', '2026-01-31')

      expect(store.timeRange).toEqual({ preset: 'custom', startDate: '2026-01-01', endDate: '2026-01-31' })
      await vi.waitFor(() => expect(mockFlowApi.getMonitorStats).toHaveBeenCalled())
    })
  })

  describe('fetchDashboard', () => {
    it('fetches all data and updates state', async () => {
      const mockStats = {
        total: 50,
        running: 5,
        completed: 40,
        terminated: 2,
        suspended: 1,
        failed: 2,
        runningPct: 10,
        completedPct: 80,
        terminatedPct: 4,
        suspendedPct: 2,
        failedPct: 4,
      }
      const mockDuration = { avgDuration: 7200000 }
      const mockNodeStats = [
        { nodeId: 'task-1', nodeName: '审批', count: 30, avgDuration: 3600000 },
      ]
      const mockTrend = [
        { date: '2026-05-01', count: 5 },
        { date: '2026-05-02', count: 8 },
      ]
      const mockTopFlows = [
        { definitionId: 'flow-1', flowName: '请假审批', count: 20 },
        { definitionId: 'flow-2', flowName: '报销审批', count: 15 },
      ]

      mockFlowApi.getMonitorStats.mockResolvedValue(mockStats)
      mockFlowApi.getMonitorAvgDuration.mockResolvedValue(mockDuration)
      mockFlowApi.getMonitorNodeStats.mockResolvedValue(mockNodeStats)
      mockFlowApi.getMonitorTrend.mockResolvedValue(mockTrend)
      mockFlowApi.getMonitorTopFlows.mockResolvedValue(mockTopFlows)

      const store = useFlowMonitorStore()
      await store.fetchDashboard()

      expect(store.stats).toEqual(mockStats)
      expect(store.avgDuration).toBe(7200000)
      expect(store.nodeStats).toEqual(mockNodeStats)
      expect(store.trend).toEqual(mockTrend)
      expect(store.topFlows).toEqual(mockTopFlows)
      expect(store.loading).toBe(false)
    })

    it('passes timeRange to stats API', async () => {
      mockFlowApi.getMonitorStats.mockResolvedValue({} as any)
      mockFlowApi.getMonitorAvgDuration.mockResolvedValue({ avgDuration: 0 })
      mockFlowApi.getMonitorNodeStats.mockResolvedValue([])
      mockFlowApi.getMonitorTrend.mockResolvedValue([])
      mockFlowApi.getMonitorTopFlows.mockResolvedValue([])

      const store = useFlowMonitorStore()
      store.timeRange = { preset: 'week' }
      await store.fetchDashboard()

      expect(mockFlowApi.getMonitorStats).toHaveBeenCalledWith({ preset: 'week' })
    })

    it('passes days and timeRange to trend API', async () => {
      mockFlowApi.getMonitorStats.mockResolvedValue({} as any)
      mockFlowApi.getMonitorAvgDuration.mockResolvedValue({ avgDuration: 0 })
      mockFlowApi.getMonitorNodeStats.mockResolvedValue([])
      mockFlowApi.getMonitorTrend.mockResolvedValue([])
      mockFlowApi.getMonitorTopFlows.mockResolvedValue([])

      const store = useFlowMonitorStore()
      store.timeRange = { preset: 'month' }
      await store.fetchDashboard(14)

      expect(mockFlowApi.getMonitorTrend).toHaveBeenCalledWith(14, { preset: 'month' })
    })

    it('sets loading during fetch', async () => {
      let resolveStats: (v: unknown) => void
      let resolveDuration: (v: unknown) => void
      let resolveNodes: (v: unknown) => void
      let resolveTrend: (v: unknown) => void
      let resolveTopFlows: (v: unknown) => void

      mockFlowApi.getMonitorStats.mockImplementation(
        () => new Promise((r) => { resolveStats = r }),
      )
      mockFlowApi.getMonitorAvgDuration.mockImplementation(
        () => new Promise((r) => { resolveDuration = r }),
      )
      mockFlowApi.getMonitorNodeStats.mockImplementation(
        () => new Promise((r) => { resolveNodes = r }),
      )
      mockFlowApi.getMonitorTrend.mockImplementation(
        () => new Promise((r) => { resolveTrend = r }),
      )
      mockFlowApi.getMonitorTopFlows.mockImplementation(
        () => new Promise((r) => { resolveTopFlows = r }),
      )

      const store = useFlowMonitorStore()
      const fetchPromise = store.fetchDashboard()

      expect(store.loading).toBe(true)

      resolveStats!({ total: 0, running: 0, completed: 0, terminated: 0, suspended: 0, failed: 0, runningPct: 0, completedPct: 0, terminatedPct: 0, suspendedPct: 0, failedPct: 0 })
      resolveDuration!({ avgDuration: 0 })
      resolveNodes!([])
      resolveTrend!([])
      resolveTopFlows!([])
      await fetchPromise

      expect(store.loading).toBe(false)
    })

    it('sets loading to false even on error', async () => {
      mockFlowApi.getMonitorStats.mockRejectedValue(new Error('Network error'))

      const store = useFlowMonitorStore()
      await expect(store.fetchDashboard()).rejects.toThrow('Network error')

      expect(store.loading).toBe(false)
    })
  })
})
