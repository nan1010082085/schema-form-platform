import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FlowStatsView from '../views/FlowStatsView.vue'

// Mock ECharts
const mockSetOption = vi.fn()
const mockResize = vi.fn()
const mockDispose = vi.fn()

vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    setOption: mockSetOption,
    resize: mockResize,
    dispose: mockDispose,
  })),
}))

// Mock store
const mockFetchDashboard = vi.fn().mockResolvedValue(undefined)
const mockSetTimeRange = vi.fn()

const mockStoreState = {
  stats: {
    total: 200,
    running: 15,
    completed: 160,
    terminated: 10,
    suspended: 5,
    failed: 10,
    runningPct: 7.5,
    completedPct: 80,
    terminatedPct: 5,
    suspendedPct: 2.5,
    failedPct: 5,
  },
  avgDuration: 7200000,
  nodeStats: [
    { nodeId: 'task-1', nodeName: '部门经理审批', count: 80, avgDuration: 5400000 },
    { nodeId: 'task-2', nodeName: 'HR 审核', count: 60, avgDuration: 3600000 },
    { nodeId: 'task-3', nodeName: '财务复核', count: 40, avgDuration: 1800000 },
  ],
  trend: [
    { date: '2026-05-01', count: 10 },
    { date: '2026-05-02', count: 15 },
    { date: '2026-05-03', count: 8 },
    { date: '2026-05-04', count: 20 },
  ],
  topFlows: [],
  todayNew: 12,
  loading: false,
  timeRange: { preset: 'month' },
  fetchDashboard: mockFetchDashboard,
  setTimeRange: mockSetTimeRange,
}

vi.mock('../stores/flowMonitor', () => ({
  useFlowMonitorStore: () => mockStoreState,
}))

describe('FlowStatsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockStoreState.loading = false
  })

  function createWrapper() {
    return mount(FlowStatsView, {
      global: {
        stubs: {
          'el-row': {
            template: '<div class="el-row"><slot /></div>',
            props: ['gutter'],
          },
          'el-col': {
            template: '<div class="el-col"><slot /></div>',
            props: ['span', 'xs', 'sm'],
          },
          'el-card': {
            template: '<div class="el-card"><slot /><slot name="header" /></div>',
            props: ['shadow'],
          },
          'el-button': {
            template: '<button class="el-button"><slot /></button>',
            props: ['icon', 'circle', 'loading'],
          },
          'el-radio-group': {
            template: '<div class="el-radio-group"><slot /></div>',
            props: ['modelValue', 'size'],
          },
          'el-radio-button': {
            template: '<button class="el-radio-button"><slot /></button>',
            props: ['value'],
          },
          'el-date-picker': {
            template: '<div class="el-date-picker"></div>',
            props: ['modelValue', 'type', 'rangeSeparator', 'startPlaceholder', 'endPlaceholder', 'size', 'valueFormat'],
          },
        },
        directives: {
          loading: () => {},
        },
      },
    })
  }

  it('mounts without errors', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('calls fetchDashboard on mount', () => {
    createWrapper()
    expect(mockFetchDashboard).toHaveBeenCalledOnce()
  })

  it('displays page title', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('流程统计')
  })

  it('displays four metric cards', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('总流程数')
    expect(wrapper.text()).toContain('运行中实例')
    expect(wrapper.text()).toContain('已完成实例')
    expect(wrapper.text()).toContain('平均完成时长')
  })

  it('displays metric values from store', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('200')
    expect(wrapper.text()).toContain('15')
    expect(wrapper.text()).toContain('160')
    expect(wrapper.text()).toContain('2 小时 0 分钟')
  })

  it('displays trend chart section title', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('流程启动量趋势')
  })

  it('displays node ranking section title', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('节点耗时排行 Top 10')
  })

  it('displays time range options', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('今日')
    expect(wrapper.text()).toContain('本周')
    expect(wrapper.text()).toContain('本月')
    expect(wrapper.text()).toContain('全部')
    expect(wrapper.text()).toContain('自定义')
  })

  it('displays trend granularity toggle', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('按日')
    expect(wrapper.text()).toContain('按周')
  })

  it('has refresh button', () => {
    const wrapper = createWrapper()
    const btn = wrapper.find('[data-test="stats-refresh-btn"]')
    expect(btn.exists()).toBe(true)
  })

  it('calls fetchDashboard on refresh click', async () => {
    const wrapper = createWrapper()
    mockFetchDashboard.mockClear()
    mockFetchDashboard.mockResolvedValue(undefined)

    const btn = wrapper.find('[data-test="stats-refresh-btn"]')
    await btn.trigger('click')

    expect(mockFetchDashboard).toHaveBeenCalledOnce()
  })

  it('formats zero duration as dash', () => {
    mockStoreState.avgDuration = 0
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('-')
  })

  it('formats duration in hours and minutes', () => {
    mockStoreState.avgDuration = 5400000 // 1h30m
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('1 小时 30 分钟')
  })

  it('formats duration in days', () => {
    mockStoreState.avgDuration = 90000000 // 25 hours = 1 day 1 hour
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('1 天 1 小时')
  })
})
