import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ElementPlus from 'element-plus'
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
  },
}))

import { flowApi } from '../api/flowApi'
const mockedApi = vi.mocked(flowApi)

// Mock ElMessageBox to auto-confirm
vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()
  return {
    ...actual,
    ElMessageBox: {
      ...actual.ElMessageBox,
      confirm: vi.fn().mockResolvedValue('confirm'),
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
  props: ['publishId', 'mode', 'hostMethods', 'initialData'],
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
  formMode: 'edit',
  hostMethods: ['setValues', 'getValues', 'validate'],
  formData: { existing: 'data' },
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
    mockedApi.getMyTasks.mockResolvedValue({ items: [] } as any)
    // Reset MicroFormEmbed stub methods
    mockGetValues.mockReset().mockResolvedValue({ field1: 'value1' })
    mockSetValues.mockReset().mockResolvedValue(undefined)
    mockValidate.mockReset().mockResolvedValue(true)
  })

  function createWrapper() {
    return mount(TaskInboxView, {
      global: {
        plugins: [ElementPlus],
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
    expect(wrapper.find('.el-table').exists()).toBe(true)
    expect(wrapper.find('.el-tabs').exists()).toBe(true)
  })

  it('calls store.fetchMyTasks on mount', () => {
    createWrapper()
    expect(mockedApi.getMyTasks).toHaveBeenCalled()
  })

  // ── Form integration tests ──

  it('shows form panel when clicking "完成" on a claimed task with formPublishId', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm] } as any)
    const wrapper = createWrapper()
    await flushPromises()

    // The task should be in the table (default tab is 'pending', but claimed task is in 'claimed' tab)
    // Switch to claimed tab
    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    // Find the "完成" button and click it
    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
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

  it('calls store.completeTask with form data when clicking "提交并完成"', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm] } as any)
    mockedApi.completeTask.mockResolvedValue({ ...claimedTaskWithForm, status: 'completed' } as any)
    const wrapper = createWrapper()
    await flushPromises()

    // Switch to claimed tab and click "完成"
    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()
    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Mock getValues to return test data
    const testData = { name: '张三', amount: 500 }
    mockGetValues.mockResolvedValueOnce(testData)

    // Click "提交并完成"
    const submitBtn = wrapper.findAll('.el-button').find((b) => b.text() === '提交并完成')
    expect(submitBtn).toBeTruthy()
    await submitBtn!.trigger('click')
    await flushPromises()

    // Verify getValues was called
    expect(mockGetValues).toHaveBeenCalled()

    // Verify completeTask was called with correct args
    expect(mockedApi.completeTask).toHaveBeenCalledWith(
      'task-with-form',
      { formData: testData, outcome: 'completed' },
    )

    // Form panel should close after successful submit
    await wrapper.vm.$nextTick()
    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.exists()).toBe(false)
  })

  it('completes task without form data when task has no formPublishId', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm] } as any)
    mockedApi.completeTask.mockResolvedValue({ ...claimedTaskWithoutForm, status: 'completed' } as any)
    const wrapper = createWrapper()
    await flushPromises()

    // Switch to claimed tab
    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    // Click "完成" — should call handleComplete directly (no form panel)
    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
    expect(completeBtn).toBeTruthy()
    await completeBtn!.trigger('click')
    await flushPromises()

    // completeTask should be called with empty formData
    expect(mockedApi.completeTask).toHaveBeenCalledWith(
      'task-without-form',
      { formData: {}, outcome: 'completed' },
    )

    // No form panel should appear
    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.exists()).toBe(false)
  })

  it('closes form panel when clicking "关闭"', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm] } as any)
    const wrapper = createWrapper()
    await flushPromises()

    // Switch to claimed tab and open form
    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()
    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Verify form is open
    expect(wrapper.findComponent({ name: 'MicroFormEmbed' }).exists()).toBe(true)

    // Click "关闭"
    const closeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '关闭')
    expect(closeBtn).toBeTruthy()
    await closeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Form panel should be closed
    expect(wrapper.findComponent({ name: 'MicroFormEmbed' }).exists()).toBe(false)
  })

  it('handles submit error gracefully', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm] } as any)
    mockedApi.completeTask.mockRejectedValue(new Error('Network error'))
    const wrapper = createWrapper()
    await flushPromises()

    // Open form
    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()
    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Click "提交并完成"
    const submitBtn = wrapper.findAll('.el-button').find((b) => b.text() === '提交并完成')
    await submitBtn!.trigger('click')
    await flushPromises()

    // Form should still be visible (error doesn't close it)
    expect(wrapper.findComponent({ name: 'MicroFormEmbed' }).exists()).toBe(true)
  })

  // ── Reject-to-node tests ──

  it('shows reject button for claimed tasks', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm] } as any)
    const wrapper = createWrapper()
    await flushPromises()

    // Switch to claimed tab
    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    // Find the "驳回" button
    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    expect(rejectBtn).toBeTruthy()
    expect(rejectBtn!.attributes('class')).toContain('el-button--danger')
  })

  it('opens reject dialog and loads targets when clicking reject', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm] } as any)
    mockedApi.getRejectTargets.mockResolvedValue([
      { nodeId: 'node-1', nodeName: '审批节点', nodeType: 'userTask' },
      { nodeId: 'node-0', nodeName: '初审节点', nodeType: 'userTask' },
    ])
    const wrapper = createWrapper()
    await flushPromises()

    // Switch to claimed tab
    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    // Click "驳回"
    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    // getRejectTargets should have been called
    expect(mockedApi.getRejectTargets).toHaveBeenCalledWith('task-without-form')

    // Dialog should appear with title
    expect(wrapper.html()).toContain('驳回到指定节点')
  })

  it('calls rejectToNode API when confirming reject', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm] } as any)
    mockedApi.getRejectTargets.mockResolvedValue([
      { nodeId: 'node-1', nodeName: '审批节点', nodeType: 'userTask' },
    ])
    mockedApi.rejectToNode.mockResolvedValue({ ...claimedTaskWithoutForm, status: 'completed' })
    const wrapper = createWrapper()
    await flushPromises()

    // Switch to claimed tab and open reject dialog
    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()
    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    // Select a target node
    const select = wrapper.findComponent({ name: 'ElSelect' })
    await select.vm.$emit('update:modelValue', 'node-1')
    await wrapper.vm.$nextTick()

    // Click "确认驳回"
    const confirmBtn = wrapper.findAll('.el-button').find((b) => b.text() === '确认驳回')
    await confirmBtn!.trigger('click')
    await flushPromises()

    // rejectToNode should be called with correct args
    expect(mockedApi.rejectToNode).toHaveBeenCalledWith(
      'task-without-form',
      { targetNodeId: 'node-1', comment: undefined },
    )
  })

  it('calls getRejectTargets when clicking reject button', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm] } as any)
    mockedApi.getRejectTargets.mockResolvedValue([])
    const wrapper = createWrapper()
    await flushPromises()

    // Switch to claimed tab
    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    // Click "驳回"
    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    // getRejectTargets should have been called
    expect(mockedApi.getRejectTargets).toHaveBeenCalledWith('task-without-form')
  })
})
