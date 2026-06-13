import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TDesign from 'tdesign-vue-next'
import TaskInboxView from '../views/TaskInboxView.vue'
import type { TaskInstanceData } from '@schema-form/flow-shared'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../api/flowApi', () => ({
  flowApi: {
    listFlows: vi.fn(),
    getFlow: vi.fn(),
    createFlow: vi.fn(),
    deleteFlow: vi.fn(),
    publishFlow: vi.fn(),
    listInstances: vi.fn(),
    getInstance: vi.fn(),
    startInstance: vi.fn(),
    terminateInstance: vi.fn(),
    suspendInstance: vi.fn(),
    resumeInstance: vi.fn(),
    getMyTasks: vi.fn(),
    claimTask: vi.fn(),
    completeTask: vi.fn(),
    delegateTask: vi.fn(),
    getRejectTargets: vi.fn(),
    rejectToNode: vi.fn(),
    searchUsers: vi.fn(),
    batchApprove: vi.fn(),
    batchReject: vi.fn(),
  },
}))

import { flowApi } from '../api/flowApi'
const mockedApi = vi.mocked(flowApi)

// Mock DialogPlugin to auto-confirm
vi.mock('tdesign-vue-next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('tdesign-vue-next')>()
  return {
    ...actual,
    DialogPlugin: {
      ...actual.DialogPlugin,
      confirm: vi.fn().mockImplementation(({ onConfirm }: { onConfirm?: () => void }) => {
        if (onConfirm) onConfirm()
        return { destroy: vi.fn() }
      }),
    },
  }
})

// Mock functions for MicroFormEmbed exposed methods
const mockGetValues = vi.fn().mockResolvedValue({ field1: 'value1' })
const mockSetValues = vi.fn().mockResolvedValue(undefined)
const mockValidate = vi.fn().mockResolvedValue(true)

// MicroFormEmbed stub that exposes methods via defineExpose pattern
const MicroFormEmbedStub = {
  name: 'MicroFormEmbed',
  props: ['publishId', 'mode', 'hostMethods', 'initialData', 'editableFields', 'readonlyFields'],
  template: '<div class="micro-form-embed-stub" />',
  methods: {
    getValues: mockGetValues,
    setValues: mockSetValues,
    validate: mockValidate,
  },
}

const claimedTaskWithForm: TaskInstanceData = {
  id: 'task-with-form',
  instanceId: 'inst-1',
  nodeId: 'node-1',
  nodeName: '审批节点',
  status: 'claimed',
  priority: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  formPublishId: 'pub-form-123',
  formMode: 'editable',
  hostMethods: ['setValues', 'getValues', 'validate'],
  formData: { existing: 'data' },
}

const claimedTaskReadonly: TaskInstanceData = {
  id: 'task-readonly',
  instanceId: 'inst-3',
  nodeId: 'node-3',
  nodeName: '只读审批节点',
  status: 'claimed',
  priority: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  formPublishId: 'pub-form-456',
  formMode: 'readonly',
  hostMethods: ['getValues', 'validate'],
  formData: { name: '只读数据' },
}

const claimedTaskPartial: TaskInstanceData = {
  id: 'task-partial',
  instanceId: 'inst-4',
  nodeId: 'node-4',
  nodeName: '部分编辑节点',
  status: 'claimed',
  priority: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  formPublishId: 'pub-form-789',
  formMode: 'partial',
  editableFields: ['comment', 'amount'],
  hostMethods: ['setValues', 'getValues', 'validate'],
  formData: { name: '部分编辑', comment: '', amount: 0 },
}

const claimedTaskWithoutForm: TaskInstanceData = {
  id: 'task-without-form',
  instanceId: 'inst-2',
  nodeId: 'node-2',
  nodeName: '普通节点',
  status: 'claimed',
  priority: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('TaskInboxView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockedApi.getMyTasks.mockResolvedValue({ items: [], total: 0 } as any)
    // Reset MicroFormEmbed stub methods
    mockGetValues.mockReset().mockResolvedValue({ field1: 'value1' })
    mockSetValues.mockReset().mockResolvedValue(undefined)
    mockValidate.mockReset().mockResolvedValue(true)
  })

  function createWrapper() {
    return mount(TaskInboxView, {
      global: {
        plugins: [TDesign],
        directives: {
          loading: () => {},
        },
        stubs: {
          MicroFormEmbed: MicroFormEmbedStub,
        },
      },
    })
  }

  it('mounts without errors', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('displays task list', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.t-table').exists()).toBe(true)
    expect(wrapper.find('.t-tabs').exists()).toBe(true)
  })

  it('calls store.fetchMyTasks on mount', () => {
    createWrapper()
    expect(mockedApi.getMyTasks).toHaveBeenCalled()
  })

  // ── Form integration tests ──

  it('shows form panel when clicking "完成" on a claimed task with formPublishId', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    // Switch to claimed tab
    const tabs = wrapper.findComponent({ name: 'TTabs' })
    await tabs.vm.$emit('update:modelValue', 'claimed')
    await wrapper.vm.$nextTick()

    // Find the "完成" button and click it
    const completeBtn = wrapper.findAll('button').find((b) => b.text() === '完成')
    expect(completeBtn).toBeTruthy()
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // MicroFormEmbed should appear with correct props
    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.exists()).toBe(true)
    expect(formEmbed.props('publishId')).toBe('pub-form-123')
    expect(formEmbed.props('mode')).toBe('edit')
    expect(formEmbed.props('initialData')).toEqual({ existing: 'data' })
  })

  it('completes task without form data when task has no formPublishId', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
    mockedApi.completeTask.mockResolvedValue({ ...claimedTaskWithoutForm, status: 'completed' } as any)
    const wrapper = createWrapper()
    await flushPromises()

    // Switch to claimed tab
    const tabs = wrapper.findComponent({ name: 'TTabs' })
    await tabs.vm.$emit('update:modelValue', 'claimed')
    await wrapper.vm.$nextTick()

    // Click "完成" — should call handleComplete directly (no form panel)
    const completeBtn = wrapper.findAll('button').find((b) => b.text() === '完成')
    expect(completeBtn).toBeTruthy()
    await completeBtn!.trigger('click')
    await flushPromises()

    // No form panel should appear
    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.exists()).toBe(false)
  })

  it('closes form panel when clicking "关闭"', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    // Switch to claimed tab and open form
    const tabs = wrapper.findComponent({ name: 'TTabs' })
    await tabs.vm.$emit('update:modelValue', 'claimed')
    await wrapper.vm.$nextTick()
    const completeBtn = wrapper.findAll('button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Verify form is open
    expect(wrapper.findComponent({ name: 'MicroFormEmbed' }).exists()).toBe(true)

    // Click "关闭"
    const closeBtn = wrapper.findAll('button').find((b) => b.text() === '关闭')
    expect(closeBtn).toBeTruthy()
    await closeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Form panel should be closed
    expect(wrapper.findComponent({ name: 'MicroFormEmbed' }).exists()).toBe(false)
  })

  // ── Form mode tests ──

  it('passes mode="edit" to MicroFormEmbed for editable form mode', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    const tabs = wrapper.findComponent({ name: 'TTabs' })
    await tabs.vm.$emit('update:modelValue', 'claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.exists()).toBe(true)
    expect(formEmbed.props('mode')).toBe('edit')
  })

  it('passes mode="view" to MicroFormEmbed for readonly form mode', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskReadonly], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    const tabs = wrapper.findComponent({ name: 'TTabs' })
    await tabs.vm.$emit('update:modelValue', 'claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.exists()).toBe(true)
    expect(formEmbed.props('mode')).toBe('view')
  })

  it('passes mode="partial" and editableFields to MicroFormEmbed for partial form mode', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskPartial], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    const tabs = wrapper.findComponent({ name: 'TTabs' })
    await tabs.vm.$emit('update:modelValue', 'claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.exists()).toBe(true)
    expect(formEmbed.props('mode')).toBe('partial')
    expect(formEmbed.props('editableFields')).toEqual(['comment', 'amount'])
  })

  it('maps legacy formMode "edit" to mode="edit"', async () => {
    const legacyEditTask: TaskInstanceData = {
      ...claimedTaskWithForm,
      id: 'task-legacy-edit',
      formMode: 'edit',
    }
    mockedApi.getMyTasks.mockResolvedValue({ items: [legacyEditTask], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    const tabs = wrapper.findComponent({ name: 'TTabs' })
    await tabs.vm.$emit('update:modelValue', 'claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.props('mode')).toBe('edit')
  })

  it('defaults to mode="edit" when formMode is undefined', async () => {
    const noModeTask: TaskInstanceData = {
      ...claimedTaskWithForm,
      id: 'task-no-mode',
      formMode: undefined,
    }
    mockedApi.getMyTasks.mockResolvedValue({ items: [noModeTask], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    const tabs = wrapper.findComponent({ name: 'TTabs' })
    await tabs.vm.$emit('update:modelValue', 'claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.props('mode')).toBe('edit')
  })
})
