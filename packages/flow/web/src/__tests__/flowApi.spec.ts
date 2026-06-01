import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flowApi } from '../api/flowApi'

describe('flowApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function mockFetch(data: unknown, success = true, status = 200) {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      text: async () => '',
      json: async () => ({ success, data, error: success ? undefined : { message: 'fail' } }),
    } as any)
  }

  describe('listFlows', () => {
    it('calls /api/flows with query params', async () => {
      mockFetch({ items: [] })
      await flowApi.listFlows({ search: 'test', status: 'draft', page: 2 })
      const url = (globalThis.fetch as any).mock.calls[0][0]
      expect(url).toContain('/api/flows?')
      expect(url).toContain('search=test')
      expect(url).toContain('status=draft')
      expect(url).toContain('page=2')
    })

    it('omits empty params', async () => {
      mockFetch({ items: [] })
      await flowApi.listFlows()
      const url = (globalThis.fetch as any).mock.calls[0][0]
      expect(url).toBe('/api/flows?')
    })
  })

  describe('getFlow', () => {
    it('calls /api/flows/:id', async () => {
      mockFetch({ id: '123' })
      await flowApi.getFlow('123')
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/flows/123', expect.anything())
    })
  })

  describe('createFlow', () => {
    it('POSTs to /api/flows', async () => {
      mockFetch({ id: 'new' })
      await flowApi.createFlow({ name: 'Test' } as any)
      const [url, opts] = (globalThis.fetch as any).mock.calls[0]
      expect(url).toBe('/api/flows')
      expect(opts.method).toBe('POST')
      expect(JSON.parse(opts.body)).toEqual({ name: 'Test' })
    })
  })

  describe('updateFlow', () => {
    it('PUTs to /api/flows/:id', async () => {
      mockFetch({ id: '123' })
      await flowApi.updateFlow('123', { name: 'Updated' } as any)
      const [url, opts] = (globalThis.fetch as any).mock.calls[0]
      expect(url).toBe('/api/flows/123')
      expect(opts.method).toBe('PUT')
    })
  })

  describe('deleteFlow', () => {
    it('DELETEs /api/flows/:id', async () => {
      mockFetch(null)
      await flowApi.deleteFlow('123')
      const [url, opts] = (globalThis.fetch as any).mock.calls[0]
      expect(url).toBe('/api/flows/123')
      expect(opts.method).toBe('DELETE')
    })
  })

  describe('publishFlow', () => {
    it('POSTs to /api/flows/:id/publish', async () => {
      mockFetch({ status: 'published' })
      await flowApi.publishFlow('123')
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/flows/123/publish', expect.anything())
    })
  })

  describe('listVersions', () => {
    it('calls /api/flows/:id/versions with pagination', async () => {
      mockFetch({ items: [] })
      await flowApi.listVersions('def1', 1, 10)
      const url = (globalThis.fetch as any).mock.calls[0][0]
      expect(url).toContain('/api/flows/def1/versions?')
      expect(url).toContain('page=1')
      expect(url).toContain('pageSize=10')
    })
  })

  describe('getVersion', () => {
    it('calls /api/flows/:defId/versions/:verId', async () => {
      mockFetch({ id: 'v1' })
      await flowApi.getVersion('def1', 'v1')
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/flows/def1/versions/v1', expect.anything())
    })
  })

  describe('getLatestVersion', () => {
    it('calls /api/flows/:id/versions/latest', async () => {
      mockFetch({ id: 'latest' })
      await flowApi.getLatestVersion('def1')
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/flows/def1/versions/latest', expect.anything())
    })
  })

  describe('saveVersion', () => {
    it('POSTs to /api/flows/:id/versions', async () => {
      mockFetch({ id: 'v2' })
      await flowApi.saveVersion('def1', { json: {} } as any)
      const [url, opts] = (globalThis.fetch as any).mock.calls[0]
      expect(url).toBe('/api/flows/def1/versions')
      expect(opts.method).toBe('POST')
    })
  })

  describe('listInstances', () => {
    it('calls /api/flow-instances with params', async () => {
      mockFetch({ items: [] })
      await flowApi.listInstances({ definitionId: 'd1', status: 'running' })
      const url = (globalThis.fetch as any).mock.calls[0][0]
      expect(url).toContain('definitionId=d1')
      expect(url).toContain('status=running')
    })
  })

  describe('getInstance', () => {
    it('calls /api/flow-instances/:id', async () => {
      mockFetch({ id: 'inst1' })
      await flowApi.getInstance('inst1')
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/flow-instances/inst1', expect.anything())
    })
  })

  describe('startInstance', () => {
    it('POSTs to /api/flow-instances', async () => {
      mockFetch({ id: 'new-inst' })
      await flowApi.startInstance({ definitionId: 'd1' } as any)
      const [url, opts] = (globalThis.fetch as any).mock.calls[0]
      expect(url).toBe('/api/flow-instances')
      expect(opts.method).toBe('POST')
    })
  })

  describe('terminateInstance', () => {
    it('POSTs to /api/flow-instances/:id/terminate', async () => {
      mockFetch({ status: 'terminated' })
      await flowApi.terminateInstance('inst1')
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/flow-instances/inst1/terminate', expect.anything())
    })
  })

  describe('suspendInstance', () => {
    it('POSTs to /api/flow-instances/:id/suspend', async () => {
      mockFetch({ status: 'suspended' })
      await flowApi.suspendInstance('inst1')
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/flow-instances/inst1/suspend', expect.anything())
    })
  })

  describe('resumeInstance', () => {
    it('POSTs to /api/flow-instances/:id/resume', async () => {
      mockFetch({ status: 'running' })
      await flowApi.resumeInstance('inst1')
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/flow-instances/inst1/resume', expect.anything())
    })
  })

  describe('getMyTasks', () => {
    it('calls /api/flow-tasks/my with pagination', async () => {
      mockFetch({ items: [] })
      await flowApi.getMyTasks(1, 20)
      const url = (globalThis.fetch as any).mock.calls[0][0]
      expect(url).toContain('/api/flow-tasks/my?')
      expect(url).toContain('page=1')
      expect(url).toContain('pageSize=20')
    })
  })

  describe('getTask', () => {
    it('calls /api/flow-tasks/:id', async () => {
      mockFetch({ id: 't1' })
      await flowApi.getTask('t1')
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/flow-tasks/t1', expect.anything())
    })
  })

  describe('claimTask', () => {
    it('POSTs to /api/flow-tasks/:id/claim', async () => {
      mockFetch({ status: 'claimed' })
      await flowApi.claimTask('t1')
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/flow-tasks/t1/claim', expect.anything())
    })
  })

  describe('completeTask', () => {
    it('POSTs to /api/flow-tasks/:id/complete', async () => {
      mockFetch({ status: 'completed' })
      await flowApi.completeTask('t1', { outcome: 'approved' } as any)
      const [url, opts] = (globalThis.fetch as any).mock.calls[0]
      expect(url).toBe('/api/flow-tasks/t1/complete')
      expect(opts.method).toBe('POST')
    })
  })

  describe('delegateTask', () => {
    it('POSTs to /api/flow-tasks/:id/delegate', async () => {
      mockFetch({ status: 'delegated' })
      await flowApi.delegateTask('t1', { assignee: 'user2' } as any)
      const [url, opts] = (globalThis.fetch as any).mock.calls[0]
      expect(url).toBe('/api/flow-tasks/t1/delegate')
      expect(opts.method).toBe('POST')
    })
  })

  describe('searchUsers', () => {
    it('calls /api/users?q=', async () => {
      mockFetch({ items: [] })
      await flowApi.searchUsers('alice')
      const url = (globalThis.fetch as any).mock.calls[0][0]
      expect(url).toContain('/api/users?')
      expect(url).toContain('q=alice')
    })
  })

  describe('error handling', () => {
    it('throws on unsuccessful response', async () => {
      mockFetch(null, false)
      await expect(flowApi.getFlow('1')).rejects.toThrow('fail')
    })

    it('uses default message when error.message missing', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: false, error: {} }),
      } as any)
      await expect(flowApi.getFlow('1')).rejects.toThrow('Request failed')
    })
  })
})
