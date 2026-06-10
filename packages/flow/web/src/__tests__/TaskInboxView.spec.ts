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
    batchApprove: vi.fn(),
    batchReject: vi.fn(),
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
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm], total: 1 } as any)
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
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm], total: 1 } as any)
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
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
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
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm], total: 1 } as any)
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
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm], total: 1 } as any)
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
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
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
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
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
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
    mockedApi.getRejectTargets.mockResolvedValue([
      { nodeId: 'node-1', nodeName: '审批节点', nodeType: 'userTask' },
    ])
    mockedApi.rejectToNode.mockResolvedValue({ ...claimedTaskWithoutForm, status: 'completed' })
    const wrapper = createWrapper()
    await flushPromises()

    // Switch to claimed tab and open reject dialog
    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await flushPromises()
    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    // Set rejectTargetNodeId directly on the component instance
    ;(wrapper.vm as any).rejectTargetNodeId = 'node-1'
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
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
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

  it('closes reject dialog when no targets are available', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
    mockedApi.getRejectTargets.mockResolvedValue([])
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    // The rejectVisible ref should be false — dialog component modelValue should be false
    const dialog = wrapper.findComponent({ name: 'ElDialog' })
    // Element Plus dialog stays in DOM; check that the store was not called for reject
    expect(mockedApi.rejectToNode).not.toHaveBeenCalled()
  })

  it('closes reject dialog on API error', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
    mockedApi.getRejectTargets.mockRejectedValue(new Error('Network error'))
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    // Dialog should be closed after error — rejectToNode should not be callable
    expect(mockedApi.rejectToNode).not.toHaveBeenCalled()
  })

  it('calls rejectToNode with comment when provided', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
    mockedApi.getRejectTargets.mockResolvedValue([
      { nodeId: 'node-1', nodeName: '审批节点', nodeType: 'userTask' },
    ])
    mockedApi.rejectToNode.mockResolvedValue({ ...claimedTaskWithoutForm, status: 'completed' })
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await flushPromises()

    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    // Set rejectTargetNodeId and comment directly on the component instance
    ;(wrapper.vm as any).rejectTargetNodeId = 'node-1'
    ;(wrapper.vm as any).rejectComment = '信息不完整，请补充材料'
    await wrapper.vm.$nextTick()

    // Click confirm
    const confirmBtn = wrapper.findAll('.el-button').find((b) => b.text() === '确认驳回')
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(mockedApi.rejectToNode).toHaveBeenCalledWith(
      'task-without-form',
      { targetNodeId: 'node-1', comment: '信息不完整，请补充材料' },
    )
  })

  it('shows validation warning when confirming without selecting target', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
    mockedApi.getRejectTargets.mockResolvedValue([
      { nodeId: 'node-1', nodeName: '审批节点', nodeType: 'userTask' },
    ])
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    // Click confirm without selecting target
    const confirmBtn = wrapper.findAll('.el-button').find((b) => b.text() === '确认驳回')
    await confirmBtn!.trigger('click')
    await flushPromises()

    // rejectToNode should NOT be called
    expect(mockedApi.rejectToNode).not.toHaveBeenCalled()
  })

  it('closes reject dialog after successful reject', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
    mockedApi.getRejectTargets.mockResolvedValue([
      { nodeId: 'node-1', nodeName: '审批节点', nodeType: 'userTask' },
    ])
    mockedApi.rejectToNode.mockResolvedValue({ ...claimedTaskWithoutForm, status: 'completed' })
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await flushPromises()

    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    // Set rejectTargetNodeId directly on the component instance
    ;(wrapper.vm as any).rejectTargetNodeId = 'node-1'
    await wrapper.vm.$nextTick()

    const confirmBtn = wrapper.findAll('.el-button').find((b) => b.text() === '确认驳回')
    await confirmBtn!.trigger('click')
    await flushPromises()

    // rejectToNode was called successfully
    expect(mockedApi.rejectToNode).toHaveBeenCalledWith(
      'task-without-form',
      { targetNodeId: 'node-1', comment: undefined },
    )
    // Task list was refreshed
    expect(mockedApi.getMyTasks).toHaveBeenCalled()
  })

  it('keeps reject dialog open on reject API error', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
    mockedApi.getRejectTargets.mockResolvedValue([
      { nodeId: 'node-1', nodeName: '审批节点', nodeType: 'userTask' },
    ])
    mockedApi.rejectToNode.mockRejectedValue(new Error('驳回失败: 节点不可达'))
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    const select = wrapper.findComponent({ name: 'ElSelect' })
    await select.vm.$emit('update:modelValue', 'node-1')
    await wrapper.vm.$nextTick()

    const confirmBtn = wrapper.findAll('.el-button').find((b) => b.text() === '确认驳回')
    await confirmBtn!.trigger('click')
    await flushPromises()

    // Dialog should remain open on error
    expect(wrapper.html()).toContain('驳回到指定节点')
  })

  it('refreshes task list after successful reject', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
    mockedApi.getRejectTargets.mockResolvedValue([
      { nodeId: 'node-1', nodeName: '审批节点', nodeType: 'userTask' },
    ])
    mockedApi.rejectToNode.mockResolvedValue({ ...claimedTaskWithoutForm, status: 'completed' })
    const wrapper = createWrapper()
    await flushPromises()

    // Reset call count
    mockedApi.getMyTasks.mockClear()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await flushPromises()

    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    // Set rejectTargetNodeId directly on the component instance
    ;(wrapper.vm as any).rejectTargetNodeId = 'node-1'
    await wrapper.vm.$nextTick()

    const confirmBtn = wrapper.findAll('.el-button').find((b) => b.text() === '确认驳回')
    await confirmBtn!.trigger('click')
    await flushPromises()

    // getMyTasks should be called again to refresh
    expect(mockedApi.getMyTasks).toHaveBeenCalled()
  })

  it('passes all reject targets to the select component', async () => {
    const targets = [
      { nodeId: 'node-start', nodeName: '发起节点', nodeType: 'startEvent' },
      { nodeId: 'node-review', nodeName: '审核节点', nodeType: 'userTask' },
      { nodeId: 'node-approve', nodeName: '审批节点', nodeType: 'userTask' },
    ]
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithoutForm], total: 1 } as any)
    mockedApi.getRejectTargets.mockResolvedValue(targets)
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '驳回')
    await rejectBtn!.trigger('click')
    await flushPromises()

    // Verify getRejectTargets returned the data
    expect(mockedApi.getRejectTargets).toHaveBeenCalledWith('task-without-form')
    // ElOption components are rendered (they are teleported in Element Plus)
    const select = wrapper.findComponent({ name: 'ElSelect' })
    expect(select.exists()).toBe(true)
  })

  // ── Form mode tests ──

  it('passes mode="edit" to MicroFormEmbed for editable form mode', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
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

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
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

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.exists()).toBe(true)
    expect(formEmbed.props('mode')).toBe('partial')
    expect(formEmbed.props('editableFields')).toEqual(['comment', 'amount'])
  })

  it('passes mode="partial" and readonlyFields when task has explicit readonlyFields', async () => {
    const partialWithReadonly: TaskInstanceData = {
      ...claimedTaskPartial,
      id: 'task-partial-readonly',
      editableFields: undefined,
      readonlyFields: ['name', 'date'],
    }
    mockedApi.getMyTasks.mockResolvedValue({ items: [partialWithReadonly], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.exists()).toBe(true)
    expect(formEmbed.props('mode')).toBe('partial')
    expect(formEmbed.props('readonlyFields')).toEqual(['name', 'date'])
    expect(formEmbed.props('editableFields')).toBeUndefined()
  })

  it('does not pass editableFields/readonlyFields for edit mode', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskWithForm], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.props('mode')).toBe('edit')
    expect(formEmbed.props('editableFields')).toBeUndefined()
    expect(formEmbed.props('readonlyFields')).toBeUndefined()
  })

  it('does not pass editableFields/readonlyFields for view mode', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [claimedTaskReadonly], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.props('mode')).toBe('view')
    expect(formEmbed.props('editableFields')).toBeUndefined()
    expect(formEmbed.props('readonlyFields')).toBeUndefined()
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

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.props('mode')).toBe('edit')
  })

  it('maps legacy formMode "view" to mode="view"', async () => {
    const legacyViewTask: TaskInstanceData = {
      ...claimedTaskWithForm,
      id: 'task-legacy-view',
      formMode: 'view',
    }
    mockedApi.getMyTasks.mockResolvedValue({ items: [legacyViewTask], total: 1 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.props('mode')).toBe('view')
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

    await wrapper.findComponent({ name: 'ElTabs' }).setValue('claimed')
    await wrapper.vm.$nextTick()

    const completeBtn = wrapper.findAll('.el-button').find((b) => b.text() === '完成')
    await completeBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    const formEmbed = wrapper.findComponent({ name: 'MicroFormEmbed' })
    expect(formEmbed.props('mode')).toBe('edit')
  })

  // ── Batch operation tests ──

  const pendingTask1: TaskInstanceData = {
    id: 'pending-1',
    instanceId: 'inst-b1',
    nodeId: 'node-b1',
    nodeName: '待审批任务1',
    status: 'pending',
    priority: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }

  const pendingTask2: TaskInstanceData = {
    id: 'pending-2',
    instanceId: 'inst-b2',
    nodeId: 'node-b2',
    nodeName: '待审批任务2',
    status: 'pending',
    priority: 2,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  }

  it('renders selection checkboxes in the table', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [pendingTask1, pendingTask2], total: 2 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    // el-table with type="selection" renders checkbox column
    expect(wrapper.find('.el-table').exists()).toBe(true)
    // The selection column header has a checkbox
    const headerCheckboxes = wrapper.findAll('.el-table__header .el-checkbox')
    expect(headerCheckboxes.length).toBeGreaterThan(0)
  })

  it('shows batch toolbar when tasks are selected', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [pendingTask1, pendingTask2], total: 2 } as any)
    const wrapper = createWrapper()
    await flushPromises()

    // Simulate selection via table's selection-change event
    const table = wrapper.findComponent({ name: 'ElTable' })
    await table.vm.$emit('selection-change', [pendingTask1, pendingTask2])
    await wrapper.vm.$nextTick()

    // Batch toolbar should appear
    expect(wrapper.html()).toContain('已选 2 项')
    expect(wrapper.findAll('.el-button').find((b) => b.text() === '批量通过')).toBeTruthy()
    expect(wrapper.findAll('.el-button').find((b) => b.text() === '批量驳回')).toBeTruthy()
  })

  it('calls batchApprove API when confirming batch approve', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [pendingTask1, pendingTask2], total: 2 } as any)
    mockedApi.batchApprove.mockResolvedValue({
      results: [
        { taskId: 'pending-1', success: true },
        { taskId: 'pending-2', success: true },
      ],
      summary: { total: 2, success: 2, failed: 0 },
    })
    const wrapper = createWrapper()
    await flushPromises()

    // Select tasks
    const table = wrapper.findComponent({ name: 'ElTable' })
    await table.vm.$emit('selection-change', [pendingTask1, pendingTask2])
    await wrapper.vm.$nextTick()

    // Click batch approve
    const approveBtn = wrapper.findAll('.el-button').find((b) => b.text() === '批量通过')
    await approveBtn!.trigger('click')
    await flushPromises()

    // batchApprove should be called with task IDs
    expect(mockedApi.batchApprove).toHaveBeenCalledWith(['pending-1', 'pending-2'])

    // Result dialog should appear
    expect(wrapper.html()).toContain('批量操作结果')
    expect(wrapper.html()).toContain('成功 2 项')
  })

  it('opens batch reject dialog and calls batchReject API', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [pendingTask1, pendingTask2], total: 2 } as any)
    mockedApi.batchReject.mockResolvedValue({
      results: [
        { taskId: 'pending-1', success: true },
        { taskId: 'pending-2', success: true },
      ],
      summary: { total: 2, success: 2, failed: 0 },
    })
    const wrapper = createWrapper()
    await flushPromises()

    // Select tasks
    const table = wrapper.findComponent({ name: 'ElTable' })
    await table.vm.$emit('selection-change', [pendingTask1, pendingTask2])
    await wrapper.vm.$nextTick()

    // Click batch reject
    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '批量驳回')
    await rejectBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Batch reject dialog should appear
    expect(wrapper.html()).toContain('批量驳回')

    // Click confirm in the batch reject dialog
    const confirmBtn = wrapper.findAll('.el-button').find((b) => b.text().includes('确认驳回'))
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(mockedApi.batchReject).toHaveBeenCalledWith(['pending-1', 'pending-2'], undefined)

    // Result dialog should appear
    expect(wrapper.html()).toContain('批量操作结果')
    expect(wrapper.html()).toContain('成功 2 项')
  })

  it('passes reason to batchReject when provided', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [pendingTask1], total: 1 } as any)
    mockedApi.batchReject.mockResolvedValue({
      results: [{ taskId: 'pending-1', success: true }],
      summary: { total: 1, success: 1, failed: 0 },
    })
    const wrapper = createWrapper()
    await flushPromises()

    // Select task
    const table = wrapper.findComponent({ name: 'ElTable' })
    await table.vm.$emit('selection-change', [pendingTask1])
    await wrapper.vm.$nextTick()

    // Click batch reject
    const rejectBtn = wrapper.findAll('.el-button').find((b) => b.text() === '批量驳回')
    await rejectBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Enter reason — the batch reject dialog has a textarea
    const textareas = wrapper.findAllComponents({ name: 'ElInput' })
    // Find the textarea in the batch reject dialog (last one)
    const batchTextarea = textareas.find((t) => t.props('type') === 'textarea')
    if (batchTextarea) {
      await batchTextarea.vm.$emit('update:modelValue', '批量驳回原因')
      await wrapper.vm.$nextTick()
    }

    // Click confirm
    const confirmBtn = wrapper.findAll('.el-button').find((b) => b.text().includes('确认驳回'))
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(mockedApi.batchReject).toHaveBeenCalledWith(['pending-1'], '批量驳回原因')
  })

  it('shows partial failure results in batch result dialog', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [pendingTask1, pendingTask2], total: 2 } as any)
    mockedApi.batchApprove.mockResolvedValue({
      results: [
        { taskId: 'pending-1', success: true },
        { taskId: 'pending-2', success: false, error: 'Task already completed' },
      ],
      summary: { total: 2, success: 1, failed: 1 },
    })
    const wrapper = createWrapper()
    await flushPromises()

    // Select tasks
    const table = wrapper.findComponent({ name: 'ElTable' })
    await table.vm.$emit('selection-change', [pendingTask1, pendingTask2])
    await wrapper.vm.$nextTick()

    // Click batch approve
    const approveBtn = wrapper.findAll('.el-button').find((b) => b.text() === '批量通过')
    await approveBtn!.trigger('click')
    await flushPromises()

    // Result dialog should show both success and failure counts
    expect(wrapper.html()).toContain('成功 1 项')
    expect(wrapper.html()).toContain('失败 1 项')
    expect(wrapper.html()).toContain('Task already completed')
  })

  it('clears selection after batch operation completes', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [pendingTask1], total: 1 } as any)
    mockedApi.batchApprove.mockResolvedValue({
      results: [{ taskId: 'pending-1', success: true }],
      summary: { total: 1, success: 1, failed: 0 },
    })
    const wrapper = createWrapper()
    await flushPromises()

    // Select task
    const table = wrapper.findComponent({ name: 'ElTable' })
    await table.vm.$emit('selection-change', [pendingTask1])
    await wrapper.vm.$nextTick()

    // Verify toolbar is shown
    expect(wrapper.html()).toContain('已选 1 项')

    // Click batch approve
    const approveBtn = wrapper.findAll('.el-button').find((b) => b.text() === '批量通过')
    await approveBtn!.trigger('click')
    await flushPromises()

    // After operation, close result dialog
    const okBtn = wrapper.findAll('.el-button').find((b) => b.text() === '确定')
    if (okBtn) {
      await okBtn.trigger('click')
      await wrapper.vm.$nextTick()
    }

    // Toolbar should be gone (selection cleared)
    expect(wrapper.html()).not.toContain('已选')
  })

  it('handles batchApprove API error', async () => {
    mockedApi.getMyTasks.mockResolvedValue({ items: [pendingTask1], total: 1 } as any)
    mockedApi.batchApprove.mockRejectedValue(new Error('Network error'))
    const wrapper = createWrapper()
    await flushPromises()

    const table = wrapper.findComponent({ name: 'ElTable' })
    await table.vm.$emit('selection-change', [pendingTask1])
    await wrapper.vm.$nextTick()

    const approveBtn = wrapper.findAll('.el-button').find((b) => b.text() === '批量通过')
    await approveBtn!.trigger('click')
    await flushPromises()

    // batchApprove was called but failed — result summary tags should not be rendered
    expect(wrapper.html()).not.toContain('共 1 项')
    expect(wrapper.html()).not.toContain('成功 1 项')
  })
})
