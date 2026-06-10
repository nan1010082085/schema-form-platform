import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCrossNodeData } from '../composables/useCrossNodeData'

vi.mock('../api/flowApi', () => ({
  flowApi: {
    getUpstreamNodeData: vi.fn(),
  },
}))

import { flowApi } from '../api/flowApi'
const mockedApi = vi.mocked(flowApi)

describe('useCrossNodeData', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedApi.getUpstreamNodeData.mockReset()
  })

  describe('initial state', () => {
    it('has empty upstream data', () => {
      const { upstreamData, loading, error, hasUpstreamData } = useCrossNodeData()
      expect(upstreamData.value).toEqual({})
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(hasUpstreamData.value).toBe(false)
    })
  })

  describe('fetchUpstreamData', () => {
    it('loads upstream data from API', async () => {
      const mockData = {
        taskId: 'task-1',
        currentNodeId: 'task-review',
        nodeData: {
          'task-approve': { amount: 5000, approver: '张三' },
          'task-init': { title: '报销申请' },
        },
      }
      mockedApi.getUpstreamNodeData.mockResolvedValue(mockData as any)

      const { upstreamData, loading, hasUpstreamData, fetchUpstreamData } = useCrossNodeData()
      await fetchUpstreamData('task-1')

      expect(loading.value).toBe(false)
      expect(hasUpstreamData.value).toBe(true)
      expect(upstreamData.value['task-approve']).toEqual({ amount: 5000, approver: '张三' })
      expect(upstreamData.value['task-init']).toEqual({ title: '报销申请' })
    })

    it('sets error on API failure', async () => {
      mockedApi.getUpstreamNodeData.mockRejectedValue(new Error('Network error'))

      const { upstreamData, error, fetchUpstreamData } = useCrossNodeData()
      await fetchUpstreamData('task-1')

      expect(error.value).toBe('Network error')
      expect(upstreamData.value).toEqual({})
    })

    it('clears error on subsequent successful fetch', async () => {
      mockedApi.getUpstreamNodeData
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({ taskId: 't', currentNodeId: 'n', nodeData: {} } as any)

      const { error, fetchUpstreamData } = useCrossNodeData()

      await fetchUpstreamData('task-1')
      expect(error.value).toBe('fail')

      await fetchUpstreamData('task-1')
      expect(error.value).toBeNull()
    })
  })

  describe('resolveInitialValues', () => {
    it('resolves cross-node references in form defaults', async () => {
      mockedApi.getUpstreamNodeData.mockResolvedValue({
        taskId: 'task-1',
        currentNodeId: 'task-current',
        nodeData: {
          'task-approve': { amount: 5000, approver: '张三' },
        },
      } as any)

      const instance = useCrossNodeData()
      await instance.fetchUpstreamData('task-1')

      // Verify upstream data was loaded
      expect(instance.upstreamData.value['task-approve']).toEqual({ amount: 5000, approver: '张三' })

      const result = instance.resolveInitialValues({
        title: '报销单 - {{task-approve.approver}}',
        amount: '{{task-approve.amount}}',
        staticField: 'no ref',
      })

      expect(result.title).toBe('报销单 - 张三')
      expect(result.amount).toBe('5000')
      expect(result.staticField).toBe('no ref')
    })

    it('returns empty object when no form defaults', async () => {
      const { resolveInitialValues } = useCrossNodeData()
      expect(resolveInitialValues()).toEqual({})
      expect(resolveInitialValues(undefined)).toEqual({})
    })

    it('resolves missing upstream data to empty string', async () => {
      mockedApi.getUpstreamNodeData.mockResolvedValue({
        taskId: 'task-1',
        currentNodeId: 'task-current',
        nodeData: {},
      } as any)

      const { fetchUpstreamData, resolveInitialValues } = useCrossNodeData()
      await fetchUpstreamData('task-1')

      const result = resolveInitialValues({
        ref: '{{missing-node.field}}',
      })

      expect(result.ref).toBe('')
    })
  })

  describe('mergeWithTaskData', () => {
    it('merges resolved defaults with task form data (task data wins)', async () => {
      mockedApi.getUpstreamNodeData.mockResolvedValue({
        taskId: 'task-1',
        currentNodeId: 'task-current',
        nodeData: {
          'task-approve': { amount: 5000 },
        },
      } as any)

      const { fetchUpstreamData, mergeWithTaskData } = useCrossNodeData()
      await fetchUpstreamData('task-1')

      const result = mergeWithTaskData(
        { amount: 8000, userField: 'custom' },  // task data (user input)
        { amount: '{{task-approve.amount}}', default: 'default-val' },  // form defaults
      )

      // task data should override resolved defaults
      expect(result.amount).toBe(8000)
      expect(result.userField).toBe('custom')
      expect(result.default).toBe('default-val')
    })

    it('uses resolved defaults when no task data', async () => {
      mockedApi.getUpstreamNodeData.mockResolvedValue({
        taskId: 'task-1',
        currentNodeId: 'task-current',
        nodeData: {
          'task-approve': { amount: 5000 },
        },
      } as any)

      const { fetchUpstreamData, mergeWithTaskData } = useCrossNodeData()
      await fetchUpstreamData('task-1')

      const result = mergeWithTaskData(
        undefined,
        { amount: '{{task-approve.amount}}' },
      )

      expect(result.amount).toBe('5000')
    })

    it('returns empty object when both inputs are empty', () => {
      const { mergeWithTaskData } = useCrossNodeData()
      expect(mergeWithTaskData()).toEqual({})
    })
  })
})
