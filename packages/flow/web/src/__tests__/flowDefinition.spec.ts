import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowDefinitionStore } from '../stores/flowDefinition'

vi.mock('../api/flowApi', () => ({
  flowApi: {
    listFlows: vi.fn(),
    getFlow: vi.fn(),
    createFlow: vi.fn(),
    deleteFlow: vi.fn(),
    publishFlow: vi.fn(),
  },
}))

import { flowApi } from '../api/flowApi'
const mockedApi = vi.mocked(flowApi)

describe('flowDefinition store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initial state', () => {
    const store = useFlowDefinitionStore()
    expect(store.definitions).toEqual([])
    expect(store.currentDefinition).toBeNull()
    expect(store.loading).toBe(false)
  })

  describe('fetchDefinitions', () => {
    it('loads definitions from API', async () => {
      const items = [{ id: '1', name: 'Test' }]
      mockedApi.listFlows.mockResolvedValue({ items } as any)
      const store = useFlowDefinitionStore()
      await store.fetchDefinitions()
      expect(store.definitions).toEqual(items)
      expect(store.loading).toBe(false)
    })

    it('sets loading to true during fetch', async () => {
      let resolveFn: any
      mockedApi.listFlows.mockReturnValue(new Promise((r) => { resolveFn = r }))
      const store = useFlowDefinitionStore()
      const p = store.fetchDefinitions()
      expect(store.loading).toBe(true)
      resolveFn({ items: [] })
      await p
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchDefinition', () => {
    it('loads single definition', async () => {
      const def = { id: '1', name: 'Test' }
      mockedApi.getFlow.mockResolvedValue(def as any)
      const store = useFlowDefinitionStore()
      await store.fetchDefinition('1')
      expect(store.currentDefinition).toEqual(def)
    })
  })

  describe('createDefinition', () => {
    it('prepends new definition to list', async () => {
      const newDef = { id: '2', name: 'New' }
      mockedApi.createFlow.mockResolvedValue(newDef as any)
      const store = useFlowDefinitionStore()
      store.definitions = [{ id: '1', name: 'Old' } as any]
      const result = await store.createDefinition({ name: 'New' })
      expect(result).toEqual(newDef)
      expect(store.definitions[0].id).toBe('2')
      expect(store.definitions).toHaveLength(2)
    })
  })

  describe('deleteDefinition', () => {
    it('removes definition from list', async () => {
      mockedApi.deleteFlow.mockResolvedValue(null as any)
      const store = useFlowDefinitionStore()
      store.definitions = [{ id: '1' }, { id: '2' }] as any[]
      await store.deleteDefinition('1')
      expect(store.definitions).toHaveLength(1)
      expect(store.definitions[0].id).toBe('2')
    })

    it('clears currentDefinition if deleted', async () => {
      mockedApi.deleteFlow.mockResolvedValue(null as any)
      const store = useFlowDefinitionStore()
      store.currentDefinition = { id: '1' } as any
      await store.deleteDefinition('1')
      expect(store.currentDefinition).toBeNull()
    })
  })

  describe('publishDefinition', () => {
    it('updates definition in list and current', async () => {
      const published = { id: '1', status: 'published' }
      mockedApi.publishFlow.mockResolvedValue(published as any)
      const store = useFlowDefinitionStore()
      store.definitions = [{ id: '1', status: 'draft' }] as any[]
      store.currentDefinition = { id: '1', status: 'draft' } as any
      await store.publishDefinition('1')
      expect(store.definitions[0].status).toBe('published')
      expect(store.currentDefinition?.status).toBe('published')
    })
  })
})
