import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowInstanceStore } from '../stores/flowInstance'

vi.mock('../api/flowApi', () => ({
  flowApi: {
    listInstances: vi.fn(),
    getInstance: vi.fn(),
    startInstance: vi.fn(),
    terminateInstance: vi.fn(),
    suspendInstance: vi.fn(),
    resumeInstance: vi.fn(),
    getMyTasks: vi.fn(),
    claimTask: vi.fn(),
    completeTask: vi.fn(),
    batchApprove: vi.fn(),
    batchReject: vi.fn(),
  },
}))

import { flowApi } from '../api/flowApi'
const mockedApi = vi.mocked(flowApi)

describe('flowInstance store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initial state', () => {
    const store = useFlowInstanceStore()
    expect(store.instances).toEqual([])
    expect(store.currentInstance).toBeNull()
    expect(store.tasks).toEqual([])
    expect(store.loading).toBe(false)
  })

  describe('fetchInstances', () => {
    it('loads instances from API', async () => {
      const items = [{ id: '1', status: 'running' }]
      mockedApi.listInstances.mockResolvedValue({ items } as any)
      const store = useFlowInstanceStore()
      await store.fetchInstances()
      expect(store.instances).toEqual(items)
      expect(store.loading).toBe(false)
    })
  })

  describe('startInstance', () => {
    it('prepends new instance to list', async () => {
      const instance = { id: 'new-1', status: 'running' }
      mockedApi.startInstance.mockResolvedValue(instance as any)
      const store = useFlowInstanceStore()
      store.instances = [{ id: 'old-1' }] as any[]
      const result = await store.startInstance('def-1', { key: 'val' })
      expect(result).toEqual(instance)
      expect(store.instances[0].id).toBe('new-1')
      expect(store.instances).toHaveLength(2)
    })
  })

  describe('fetchInstanceDetail', () => {
    it('loads single instance', async () => {
      const instance = { id: '1', status: 'running' }
      mockedApi.getInstance.mockResolvedValue(instance as any)
      const store = useFlowInstanceStore()
      await store.fetchInstanceDetail('1')
      expect(store.currentInstance).toEqual(instance)
    })
  })

  describe('terminateInstance', () => {
    it('updates instance in list and current', async () => {
      const terminated = { id: '1', status: 'terminated' }
      mockedApi.terminateInstance.mockResolvedValue(terminated as any)
      const store = useFlowInstanceStore()
      store.instances = [{ id: '1', status: 'running' }] as any[]
      store.currentInstance = { id: '1', status: 'running' } as any
      await store.terminateInstance('1')
      expect(store.instances[0].status).toBe('terminated')
      expect(store.currentInstance?.status).toBe('terminated')
    })

    it('does not crash if instance not in list', async () => {
      mockedApi.terminateInstance.mockResolvedValue({ id: '1' } as any)
      const store = useFlowInstanceStore()
      await store.terminateInstance('1')
      expect(store.instances).toHaveLength(0)
    })
  })

  describe('suspendInstance', () => {
    it('updates instance status to suspended', async () => {
      const suspended = { id: '1', status: 'suspended' }
      mockedApi.suspendInstance.mockResolvedValue(suspended as any)
      const store = useFlowInstanceStore()
      store.instances = [{ id: '1', status: 'running' }] as any[]
      await store.suspendInstance('1')
      expect(store.instances[0].status).toBe('suspended')
    })
  })

  describe('resumeInstance', () => {
    it('updates instance status to running', async () => {
      const resumed = { id: '1', status: 'running' }
      mockedApi.resumeInstance.mockResolvedValue(resumed as any)
      const store = useFlowInstanceStore()
      store.instances = [{ id: '1', status: 'suspended' }] as any[]
      await store.resumeInstance('1')
      expect(store.instances[0].status).toBe('running')
    })
  })

  describe('fetchMyTasks', () => {
    it('loads tasks from API', async () => {
      const items = [{ id: 't1', status: 'pending' }]
      mockedApi.getMyTasks.mockResolvedValue({ items, total: 1 } as any)
      const store = useFlowInstanceStore()
      await store.fetchMyTasks()
      expect(store.tasks).toEqual(items)
      expect(store.tasksTotal).toBe(1)
    })
  })

  describe('claimTask', () => {
    it('updates task in list', async () => {
      const claimed = { id: 't1', status: 'claimed', assignee: 'user1' }
      mockedApi.claimTask.mockResolvedValue(claimed as any)
      const store = useFlowInstanceStore()
      store.tasks = [{ id: 't1', status: 'pending' }] as any[]
      const result = await store.claimTask('t1')
      expect(result.status).toBe('claimed')
      expect(store.tasks[0].status).toBe('claimed')
    })
  })

  describe('completeTask', () => {
    it('updates task in list', async () => {
      const completed = { id: 't1', status: 'completed', outcome: 'approved' }
      mockedApi.completeTask.mockResolvedValue(completed as any)
      const store = useFlowInstanceStore()
      store.tasks = [{ id: 't1', status: 'claimed' }] as any[]
      const result = await store.completeTask('t1', { form: 'data' }, 'approved')
      expect(result.status).toBe('completed')
      expect(store.tasks[0].status).toBe('completed')
    })
  })

  describe('batchApprove', () => {
    it('calls API and refreshes task list', async () => {
      const batchResult = {
        results: [
          { taskId: 't1', success: true },
          { taskId: 't2', success: true },
        ],
        summary: { total: 2, success: 2, failed: 0 },
      }
      mockedApi.batchApprove.mockResolvedValue(batchResult as any)
      mockedApi.getMyTasks.mockResolvedValue({ items: [], total: 0 } as any)
      const store = useFlowInstanceStore()
      const result = await store.batchApprove(['t1', 't2'])
      expect(result.summary.success).toBe(2)
      expect(mockedApi.batchApprove).toHaveBeenCalledWith(['t1', 't2'])
      expect(mockedApi.getMyTasks).toHaveBeenCalled()
    })

    it('returns partial failure results', async () => {
      const batchResult = {
        results: [
          { taskId: 't1', success: true },
          { taskId: 't2', success: false, error: 'Already completed' },
        ],
        summary: { total: 2, success: 1, failed: 1 },
      }
      mockedApi.batchApprove.mockResolvedValue(batchResult as any)
      mockedApi.getMyTasks.mockResolvedValue({ items: [], total: 0 } as any)
      const store = useFlowInstanceStore()
      const result = await store.batchApprove(['t1', 't2'])
      expect(result.summary.failed).toBe(1)
      expect(result.results[1].error).toBe('Already completed')
    })
  })

  describe('batchReject', () => {
    it('calls API with reason and refreshes task list', async () => {
      const batchResult = {
        results: [{ taskId: 't1', success: true }],
        summary: { total: 1, success: 1, failed: 0 },
      }
      mockedApi.batchReject.mockResolvedValue(batchResult as any)
      mockedApi.getMyTasks.mockResolvedValue({ items: [], total: 0 } as any)
      const store = useFlowInstanceStore()
      const result = await store.batchReject(['t1'], '不符合要求')
      expect(result.summary.success).toBe(1)
      expect(mockedApi.batchReject).toHaveBeenCalledWith(['t1'], '不符合要求')
      expect(mockedApi.getMyTasks).toHaveBeenCalled()
    })

    it('calls API without reason', async () => {
      const batchResult = {
        results: [{ taskId: 't1', success: true }],
        summary: { total: 1, success: 1, failed: 0 },
      }
      mockedApi.batchReject.mockResolvedValue(batchResult as any)
      mockedApi.getMyTasks.mockResolvedValue({ items: [], total: 0 } as any)
      const store = useFlowInstanceStore()
      await store.batchReject(['t1'])
      expect(mockedApi.batchReject).toHaveBeenCalledWith(['t1'], undefined)
    })
  })
})
