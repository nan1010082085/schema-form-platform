import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowMonitorStore } from '../stores/flowMonitor'

vi.mock('../api/flowApi', () => ({
  flowApi: {
    getMonitorStats: vi.fn(),
    getMonitorAvgDuration: vi.fn(),
    getMonitorNodeStats: vi.fn(),
    getMonitorTrend: vi.fn(),
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
    expect(store.avgDuration).toBe(0)
    expect(store.nodeStats).toEqual([])
    expect(store.trend).toEqual([])
    expect(store.loading).toBe(false)
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
      }
      const mockDuration = { avgDuration: 7200000 }
      const mockNodeStats = [
        { nodeId: 'task-1', nodeName: '审批', count: 30, avgDuration: 3600000 },
      ]
      const mockTrend = [
        { date: '2026-05-01', count: 5 },
        { date: '2026-05-02', count: 8 },
      ]

      mockFlowApi.getMonitorStats.mockResolvedValue(mockStats)
      mockFlowApi.getMonitorAvgDuration.mockResolvedValue(mockDuration)
      mockFlowApi.getMonitorNodeStats.mockResolvedValue(mockNodeStats)
      mockFlowApi.getMonitorTrend.mockResolvedValue(mockTrend)

      const store = useFlowMonitorStore()
      await store.fetchDashboard()

      expect(store.stats).toEqual(mockStats)
      expect(store.avgDuration).toBe(7200000)
      expect(store.nodeStats).toEqual(mockNodeStats)
      expect(store.trend).toEqual(mockTrend)
      expect(store.loading).toBe(false)
    })

    it('passes days parameter to trend API', async () => {
      mockFlowApi.getMonitorStats.mockResolvedValue({} as any)
      mockFlowApi.getMonitorAvgDuration.mockResolvedValue({ avgDuration: 0 })
      mockFlowApi.getMonitorNodeStats.mockResolvedValue([])
      mockFlowApi.getMonitorTrend.mockResolvedValue([])

      const store = useFlowMonitorStore()
      await store.fetchDashboard(14)

      expect(mockFlowApi.getMonitorTrend).toHaveBeenCalledWith(14)
    })

    it('sets loading during fetch', async () => {
      // Create resolvers for each API call
      let resolveStats: (v: unknown) => void
      let resolveDuration: (v: unknown) => void
      let resolveNodes: (v: unknown) => void
      let resolveTrend: (v: unknown) => void

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

      const store = useFlowMonitorStore()
      const fetchPromise = store.fetchDashboard()

      // Loading should be true while requests are pending
      expect(store.loading).toBe(true)

      // Resolve all requests with valid data
      resolveStats!({ total: 0, running: 0, completed: 0, terminated: 0, suspended: 0, failed: 0 })
      resolveDuration!({ avgDuration: 0 })
      resolveNodes!([])
      resolveTrend!([])
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
