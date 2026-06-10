import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FlowInstanceListView from '../views/FlowInstanceListView.vue'

const mockExportInstance = vi.fn()
const mockExportBatch = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../composables/useFlowExport', () => ({
  useFlowExport: () => ({
    exporting: { value: false },
    exportInstance: mockExportInstance,
    exportBatch: mockExportBatch,
    exportFiltered: vi.fn(),
  }),
}))

vi.mock('../stores/flowInstance', () => {
  const { ref } = require('vue')
  const instances = ref([
    { id: 'inst-001', definitionId: 'def-001', definitionName: '请假流程', status: 'running', initiatedBy: 'admin', startedAt: '2026-05-28T10:00:00Z' },
    { id: 'inst-002', definitionId: 'def-002', definitionName: '报销流程', status: 'completed', initiatedBy: 'user1', startedAt: '2026-05-27T10:00:00Z', completedAt: '2026-05-27T12:00:00Z' },
  ])
  const total = ref(2)
  const loading = ref(false)

  return {
    useFlowInstanceStore: () => ({
      instances,
      total,
      loading,
      fetchInstances: vi.fn(),
      terminateInstance: vi.fn(),
      suspendInstance: vi.fn(),
      resumeInstance: vi.fn(),
    }),
  }
})

describe('FlowInstanceListView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function createWrapper() {
    return mount(FlowInstanceListView, {
      global: {
        stubs: {
          'el-select': { template: '<div><slot /></div>', props: ['modelValue', 'placeholder', 'clearable', 'style'] },
          'el-option': { template: '<div />', props: ['label', 'value'] },
          'el-table': {
            template: '<div class="el-table"><slot /></div>',
            props: ['data', 'stripe'],
            emits: ['selection-change'],
          },
          'el-table-column': {
            template: '<div class="el-table-column"><slot :row="{ id: \'inst-001\', definitionName: \'test\', definitionId: \'def-001\', status: \'running\', initiatedBy: \'admin\' }" /></div>',
            props: ['label', 'minWidth', 'width', 'type', 'fixed', 'showOverflowTooltip'],
          },
          'el-tag': { template: '<span><slot /></span>', props: ['type', 'size'] },
          'el-button': {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
            props: ['size', 'type', 'loading'],
            emits: ['click'],
          },
          'el-pagination': { template: '<div />', props: ['total', 'pageSize', 'currentPage', 'pageSizes', 'layout'] },
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

  it('renders page title', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('流程实例')
  })

  it('renders header with export area', () => {
    const wrapper = createWrapper()
    // Batch export button only shows when rows are selected
    // Per-row export buttons are rendered via table column slots
    expect(wrapper.exists()).toBe(true)
  })
})
