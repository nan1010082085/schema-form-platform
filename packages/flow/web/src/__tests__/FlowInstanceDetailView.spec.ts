import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FlowInstanceDetailView from '../views/FlowInstanceDetailView.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'inst-001' },
  }),
}))

vi.mock('@vue-flow/core', () => ({
  VueFlow: {
    template: '<div class="vue-flow"><slot /></div>',
    props: ['nodes', 'edges', 'fitViewOnInit'],
  },
  useVueFlow: vi.fn(),
}))

vi.mock('@vue-flow/background', () => ({
  Background: { template: '<div class="background" />' },
}))

vi.mock('../stores/flowInstance', () => {
  const mockStore = {
    loading: false,
    currentInstance: null as any,
    fetchInstanceDetail: vi.fn(),
    terminateInstance: vi.fn(),
    suspendInstance: vi.fn(),
    resumeInstance: vi.fn(),
  }
  return {
    useFlowInstanceStore: () => mockStore,
    __mockStore: mockStore,
  }
})

import { __mockStore as mockStore } from '../stores/flowInstance'

describe('FlowInstanceDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockStore.loading = false
    mockStore.currentInstance = null
  })

  function createWrapper() {
    return mount(FlowInstanceDetailView, {
      global: {
        stubs: {
          'el-tag': {
            props: ['type', 'size'],
            template: '<span class="el-tag"><slot /></span>',
          },
          'el-timeline': { template: '<div class="el-timeline"><slot /></div>' },
          'el-timeline-item': {
            props: ['type', 'timestamp', 'placement'],
            template: '<div class="el-timeline-item"><slot /></div>',
          },
          'el-descriptions': {
            props: ['column', 'border', 'size'],
            template: '<div class="el-descriptions"><slot /></div>',
          },
          'el-descriptions-item': {
            props: ['label'],
            template: '<div class="el-descriptions-item"><slot /></div>',
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

  it('displays instance details', async () => {
    mockStore.currentInstance = {
      id: 'inst-001',
      definitionId: 'def-001',
      versionId: 'ver-001',
      version: 1,
      status: 'running',
      variables: { key1: 'value1' },
      tokens: [
        { tokenId: 't1', nodeId: 'start', state: 'completed' },
        { tokenId: 't2', nodeId: 'task-1', state: 'active' },
      ],
      initiatedBy: 'admin',
      startedAt: '2026-05-28T10:00:00Z',
      createdAt: '2026-05-28T10:00:00Z',
      updatedAt: '2026-05-28T10:00:00Z',
    }

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('inst-001')
    expect(wrapper.text()).toContain('admin')
    expect(wrapper.text()).toContain('运行中')
  })

  it('renders activity timeline with tokens', async () => {
    mockStore.currentInstance = {
      id: 'inst-001',
      status: 'completed',
      variables: {},
      tokens: [
        { tokenId: 't1', nodeId: 'start', state: 'completed' },
        { tokenId: 't2', nodeId: 'task-1', state: 'completed' },
      ],
      initiatedBy: 'admin',
      startedAt: '2026-05-28T10:00:00Z',
      completedAt: '2026-05-28T11:00:00Z',
      createdAt: '2026-05-28T10:00:00Z',
      updatedAt: '2026-05-28T11:00:00Z',
    }

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.el-timeline').exists()).toBe(true)
    expect(wrapper.text()).toContain('start')
    expect(wrapper.text()).toContain('task-1')
  })

  it('renders flow variables when present', async () => {
    mockStore.currentInstance = {
      id: 'inst-001',
      status: 'running',
      variables: { assignee: 'alice', amount: 500 },
      tokens: [],
      initiatedBy: 'admin',
      startedAt: '2026-05-28T10:00:00Z',
      createdAt: '2026-05-28T10:00:00Z',
      updatedAt: '2026-05-28T10:00:00Z',
    }

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.el-descriptions').exists()).toBe(true)
  })
})
