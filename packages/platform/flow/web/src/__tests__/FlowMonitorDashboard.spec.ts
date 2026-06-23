import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FlowMonitorDashboard from '../components/FlowMonitorDashboard.vue'

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

// Mock router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock store
const mockFetchDashboard = vi.fn().mockResolvedValue(undefined)
const mockSetTimeRange = vi.fn()

const mockStoreState = {
  stats: {
    total: 100,
    running: 10,
    completed: 80,
    terminated: 5,
    suspended: 3,
    failed: 2,
    runningPct: 10,
    completedPct: 80,
    terminatedPct: 5,
    suspendedPct: 3,
    failedPct: 2,
  },
  avgDuration: 3600000,
  nodeStats: [
    { nodeId: 'task-1', nodeName: '审批节点', count: 50, avgDuration: 1800000 },
    { nodeId: 'task-2', nodeName: '会签节点', count: 30, avgDuration: 7200000 },
  ],
  trend: [
    { date: '2026-05-01', count: 5 },
    { date: '2026-05-02', count: 8 },
  ],
  topFlows: [
    { definitionId: 'flow-1', flowName: '请假审批', count: 20 },
    { definitionId: 'flow-2', flowName: '报销审批', count: 15 },
  ],
  todayNew: 8,
  loading: false,
  timeRange: { preset: 'month' },
  fetchDashboard: mockFetchDashboard,
  setTimeRange: mockSetTimeRange,
}

vi.mock('../stores/flowMonitor', () => ({
  useFlowMonitorStore: () => mockStoreState,
}))

describe('FlowMonitorDashboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockStoreState.loading = false
    mockStoreState.stats = {
      total: 100,
      running: 10,
      completed: 80,
      terminated: 5,
      suspended: 3,
      failed: 2,
      runningPct: 10,
      completedPct: 80,
      terminatedPct: 5,
      suspendedPct: 3,
      failedPct: 2,
    }
  })

  function createWrapper() {
    return mount(FlowMonitorDashboard, {
      global: {
        stubs: {
          'el-row': {
            template: '<div class="el-row"><slot /></div>',
            props: ['gutter'],
          },
          'el-col': {
            template: '<div class="el-col"><slot /></div>',
            props: ['span', 'xs', 'sm', 'md'],
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
    expect(wrapper.text()).toContain('流程监控仪表盘')
  })

  it('displays all stat cards', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('总实例数')
    expect(wrapper.text()).toContain('运行中')
    expect(wrapper.text()).toContain('已完成')
    expect(wrapper.text()).toContain('已失败')
    expect(wrapper.text()).toContain('已终止')
    expect(wrapper.text()).toContain('已挂起')
    expect(wrapper.text()).toContain('今日新增')
    expect(wrapper.text()).toContain('平均处理时长')
  })

  it('displays stat values', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('100')
    expect(wrapper.text()).toContain('10')
    expect(wrapper.text()).toContain('8')
    expect(wrapper.text()).toContain('1 小时 0 分钟')
  })

  it('displays percentage values', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('80%')
    expect(wrapper.text()).toContain('10%')
    expect(wrapper.text()).toContain('2%')
  })

  it('displays chart section titles', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('流程实例状态分布')
    expect(wrapper.text()).toContain('每日实例数量趋势')
    expect(wrapper.text()).toContain('节点平均处理时间')
    expect(wrapper.text()).toContain('热门流程 Top 5')
  })

  it('has a refresh button', () => {
    const wrapper = createWrapper()
    const btn = wrapper.find('[data-test="refresh-btn"]')
    expect(btn.exists()).toBe(true)
  })

  it('calls fetchDashboard when refresh button clicked', async () => {
    const wrapper = createWrapper()
    mockFetchDashboard.mockClear()
    mockFetchDashboard.mockResolvedValue(undefined)

    const btn = wrapper.find('[data-test="refresh-btn"]')
    await btn.trigger('click')

    expect(mockFetchDashboard).toHaveBeenCalledOnce()
  })

  it('displays time range selector', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('今日')
    expect(wrapper.text()).toContain('本周')
    expect(wrapper.text()).toContain('本月')
    expect(wrapper.text()).toContain('全部')
    expect(wrapper.text()).toContain('自定义')
  })

  it('failed stat card is clickable and navigates to instances filtered by failed', async () => {
    const wrapper = createWrapper()
    const failedCard = wrapper.find('[data-test="failed-card"]')
    expect(failedCard.exists()).toBe(true)

    await failedCard.trigger('click')
    expect(mockPush).toHaveBeenCalledWith({
      name: 'flow-instances',
      query: { status: 'failed' },
    })
  })

  it('formats zero duration as dash', () => {
    mockStoreState.avgDuration = 0
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('-')
  })

  it('formats minutes correctly', () => {
    mockStoreState.avgDuration = 180000 // 3 minutes
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('3 分钟')
  })

  it('formats hours and minutes correctly', () => {
    mockStoreState.avgDuration = 5400000 // 1h30m
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('1 小时 30 分钟')
  })
})
