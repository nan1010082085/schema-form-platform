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

vi.mock('../composables/useFlowExport', () => ({
  useFlowExport: () => ({
    exporting: { value: false },
    exportInstance: vi.fn(),
    exportBatch: vi.fn(),
    exportFiltered: vi.fn(),
  }),
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
      version: 'v20260528100000',
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

  it('renders export button', async () => {
    mockStore.currentInstance = {
      id: 'inst-001',
      status: 'running',
      variables: {},
      tokens: [],
      initiatedBy: 'admin',
      startedAt: '2026-05-28T10:00:00Z',
      createdAt: '2026-05-28T10:00:00Z',
      updatedAt: '2026-05-28T10:00:00Z',
    }

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('导出审批记录')
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

  it('assigns node-running class to active nodes when instance is running', async () => {
    mockStore.currentInstance = {
      id: 'inst-001',
      definitionId: 'def-001',
      versionId: 'ver-001',
      version: 'v20260528100000',
      status: 'running',
      variables: {},
      tokens: [
        { tokenId: 't1', nodeId: 'start', state: 'completed' },
        { tokenId: 't2', nodeId: 'task-1', state: 'active' },
        { tokenId: 't3', nodeId: 'task-2', state: 'waiting' },
      ],
      initiatedBy: 'admin',
      startedAt: '2026-05-28T10:00:00Z',
      createdAt: '2026-05-28T10:00:00Z',
      updatedAt: '2026-05-28T10:00:00Z',
    }

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Access the component instance to test getNodeClass
    const vm = wrapper.vm as any
    expect(vm.getNodeClass('active', 'running')).toBe('node-running')
    expect(vm.getNodeClass('completed', 'running')).toBe('node-completed')
    expect(vm.getNodeClass('waiting', 'running')).toBe('node-waiting')
  })

  it('assigns node-failed class to active/waiting nodes when instance failed', async () => {
    mockStore.currentInstance = {
      id: 'inst-001',
      definitionId: 'def-001',
      versionId: 'ver-001',
      version: 'v20260528100000',
      status: 'failed',
      variables: {},
      tokens: [
        { tokenId: 't1', nodeId: 'start', state: 'completed' },
        { tokenId: 't2', nodeId: 'task-1', state: 'active' },
        { tokenId: 't3', nodeId: 'task-2', state: 'waiting' },
      ],
      initiatedBy: 'admin',
      startedAt: '2026-05-28T10:00:00Z',
      createdAt: '2026-05-28T10:00:00Z',
      updatedAt: '2026-05-28T10:00:00Z',
    }

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const vm = wrapper.vm as any
    // Active nodes should show as failed when instance failed
    expect(vm.getNodeClass('active', 'failed')).toBe('node-failed')
    // Waiting nodes should show as failed when instance failed
    expect(vm.getNodeClass('waiting', 'failed')).toBe('node-failed')
    // Completed nodes remain completed even when instance failed
    expect(vm.getNodeClass('completed', 'failed')).toBe('node-completed')
  })

  it('assigns edge-failed class when instance failed and edge connects to active/waiting node', async () => {
    mockStore.currentInstance = {
      id: 'inst-001',
      definitionId: 'def-001',
      versionId: 'ver-001',
      version: 'v20260528100000',
      status: 'failed',
      variables: {},
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

    const vm = wrapper.vm as any
    // Edge targeting active node in failed instance should be edge-failed
    expect(vm.resolveEdgeState('completed', 'active', 'failed')).toBe('edge-failed')
    // Edge from active node in failed instance should be edge-failed
    expect(vm.resolveEdgeState('active', 'completed', 'failed')).toBe('edge-failed')
    // Edge between completed nodes should remain edge-completed
    expect(vm.resolveEdgeState('completed', 'completed', 'failed')).toBe('edge-completed')
  })

  it('renders status icon indicators for different node states', async () => {
    mockStore.currentInstance = {
      id: 'inst-001',
      definitionId: 'def-001',
      versionId: 'ver-001',
      version: 'v20260528100000',
      status: 'running',
      variables: {},
      tokens: [
        { tokenId: 't1', nodeId: 'start', state: 'completed' },
        { tokenId: 't2', nodeId: 'task-1', state: 'active' },
        { tokenId: 't3', nodeId: 'task-2', state: 'waiting' },
      ],
      initiatedBy: 'admin',
      startedAt: '2026-05-28T10:00:00Z',
      createdAt: '2026-05-28T10:00:00Z',
      updatedAt: '2026-05-28T10:00:00Z',
    }

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Verify the node classes are applied correctly
    const vm = wrapper.vm as any
    expect(vm.getNodeClass('completed')).toBe('node-completed')
    expect(vm.getNodeClass('active')).toBe('node-running')
    expect(vm.getNodeClass('waiting')).toBe('node-waiting')
  })
})
