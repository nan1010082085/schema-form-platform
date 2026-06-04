import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FlowMonitor from '../views/FlowMonitor.vue'

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
const mockStoreState = {
  stats: {
    total: 100,
    running: 10,
    completed: 80,
    terminated: 5,
    suspended: 3,
    failed: 2,
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
  loading: false,
  fetchDashboard: vi.fn(),
}

vi.mock('../stores/flowMonitor', () => ({
  useFlowMonitorStore: () => mockStoreState,
}))

import { __mockStore as mockStore } from '../stores/flowMonitor'

describe('FlowMonitor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockStoreState.loading = false
  })

  function createWrapper() {
    return mount(FlowMonitor, {
      global: {
        stubs: {
          'el-row': {
            template: '<div class="el-row"><slot /></div>',
            props: ['gutter'],
          },
          'el-col': {
            template: '<div class="el-col"><slot /></div>',
            props: ['span'],
          },
          'el-card': {
            template: '<div class="el-card"><slot /><slot name="header" /></div>',
            props: ['shadow'],
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
    expect(mockStoreState.fetchDashboard).toHaveBeenCalledOnce()
  })

  it('displays page title', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('流程监控仪表盘')
  })

  it('displays stat cards with values', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('流程总数')
    expect(wrapper.text()).toContain('运行中')
    expect(wrapper.text()).toContain('已完成')
    expect(wrapper.text()).toContain('失败')
    expect(wrapper.text()).toContain('100')
    expect(wrapper.text()).toContain('10')
    expect(wrapper.text()).toContain('80')
    expect(wrapper.text()).toContain('2')
  })

  it('displays average duration', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('已完成流程平均时长')
    expect(wrapper.text()).toContain('1 小时 0 分钟')
  })

  it('displays chart sections', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('近 30 天实例趋势')
    expect(wrapper.text()).toContain('节点耗时分布')
  })
})
