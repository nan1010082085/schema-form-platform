/**
 * useTenantStore tests
 *
 * Covers:
 * - fetchTenants: loads list, pagination, search, status filter
 * - createTenant: creates and refreshes list
 * - updateTenant: updates and patches local item
 * - deleteTenant: removes item and adjusts pagination
 * - toggleTenantStatus: delegates to updateTenant
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTenantStore } from '@/stores/tenant'
import type { TenantItem, TenantStatus } from '@/types/tenant'
import { ApiError, apiClient } from '@/utils/apiClient'

vi.mock('@/utils/apiClient', () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
  return {
    ApiError: class extends Error {
      status: number
      constructor(message: string, status = 500) {
        super(message)
        this.status = status
      }
    },
    apiClient: mockClient,
  }
})

const mockGet = vi.mocked(apiClient.get)
const mockPost = vi.mocked(apiClient.post)
const mockPut = vi.mocked(apiClient.put)
const mockDelete = vi.mocked(apiClient.delete)

function makeTenant(overrides: Partial<TenantItem> = {}): TenantItem {
  return {
    id: 'tenant-001',
    name: 'Test Tenant',
    code: 'test-tenant',
    status: 'active',
    config: { maxUsers: 100, features: [] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makePaginated(items: TenantItem[], total = items.length) {
  return {
    items,
    total,
    page: 1,
    pageSize: 20,
    totalPages: Math.ceil(total / 20),
  }
}

describe('useTenantStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ------------------------------------------------------------------
  // Initial state
  // ------------------------------------------------------------------

  it('has correct initial state', () => {
    const store = useTenantStore()
    expect(store.tenants).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe('')
    expect(store.searchQuery).toBe('')
    expect(store.statusFilter).toBe('')
    expect(store.pagination.page).toBe(1)
    expect(store.pagination.pageSize).toBe(20)
    expect(store.pagination.total).toBe(0)
    expect(store.hasTenants).toBe(false)
    expect(store.isEmpty).toBe(true)
    expect(store.hasError).toBe(false)
  })

  // ------------------------------------------------------------------
  // fetchTenants
  // ------------------------------------------------------------------

  it('fetches tenants and updates state', async () => {
    const items = [makeTenant(), makeTenant({ id: 't-2', name: 'Tenant 2', code: 't2' })]
    mockGet.mockResolvedValue(makePaginated(items, 2))

    const store = useTenantStore()
    const result = await store.fetchTenants()

    expect(mockGet).toHaveBeenCalledWith('/tenants', expect.objectContaining({ page: '1', pageSize: '20' }))
    expect(store.tenants).toHaveLength(2)
    expect(store.pagination.total).toBe(2)
    expect(store.hasTenants).toBe(true)
    expect(store.isEmpty).toBe(false)
    expect(result).toEqual(makePaginated(items, 2))
  })

  it('passes search and status params', async () => {
    mockGet.mockResolvedValue(makePaginated([]))

    const store = useTenantStore()
    await store.fetchTenants({ search: 'foo', status: 'active' })

    expect(mockGet).toHaveBeenCalledWith('/tenants', expect.objectContaining({
      search: 'foo',
      status: 'active',
    }))
  })

  it('sets error on fetch failure', async () => {
    mockGet.mockRejectedValue(new ApiError('Network error', 500))

    const store = useTenantStore()
    const result = await store.fetchTenants()

    expect(result).toBeNull()
    expect(store.error).toBe('Network error')
    expect(store.hasError).toBe(true)
    expect(store.loading).toBe(false)
  })

  // ------------------------------------------------------------------
  // createTenant
  // ------------------------------------------------------------------

  it('creates tenant and refreshes list', async () => {
    const created = makeTenant()
    mockPost.mockResolvedValue(created)
    mockGet.mockResolvedValue(makePaginated([created]))

    const store = useTenantStore()
    const result = await store.createTenant({ name: 'Test', code: 'test' })

    expect(mockPost).toHaveBeenCalledWith('/tenants', { name: 'Test', code: 'test' })
    expect(result).toEqual(created)
    // createTenant calls fetchTenants({ page: 1 })
    expect(mockGet).toHaveBeenCalled()
  })

  it('returns null on create failure', async () => {
    mockPost.mockRejectedValue(new ApiError('Code exists', 409))

    const store = useTenantStore()
    const result = await store.createTenant({ name: 'Dup', code: 'dup' })

    expect(result).toBeNull()
    expect(store.error).toBe('Code exists')
  })

  // ------------------------------------------------------------------
  // updateTenant
  // ------------------------------------------------------------------

  it('updates tenant and patches local list', async () => {
    const original = makeTenant()
    const updated = makeTenant({ name: 'Updated' })
    mockGet.mockResolvedValue(makePaginated([original]))

    const store = useTenantStore()
    await store.fetchTenants()

    mockPut.mockResolvedValue(updated)
    const result = await store.updateTenant('tenant-001', { name: 'Updated' })

    expect(mockPut).toHaveBeenCalledWith('/tenants/tenant-001', { name: 'Updated' })
    expect(result).toEqual(updated)
    expect(store.tenants[0].name).toBe('Updated')
  })

  // ------------------------------------------------------------------
  // deleteTenant
  // ------------------------------------------------------------------

  it('deletes tenant and removes from local list', async () => {
    const t1 = makeTenant({ id: 't1' })
    const t2 = makeTenant({ id: 't2', name: 'T2', code: 't2' })
    mockGet.mockResolvedValue(makePaginated([t1, t2], 2))

    const store = useTenantStore()
    await store.fetchTenants()
    expect(store.tenants).toHaveLength(2)

    mockDelete.mockResolvedValue(null)
    const ok = await store.deleteTenant('t1')

    expect(ok).toBe(true)
    expect(mockDelete).toHaveBeenCalledWith('/tenants/t1')
    expect(store.tenants).toHaveLength(1)
    expect(store.tenants[0].id).toBe('t2')
    expect(store.pagination.total).toBe(1)
  })

  it('handles delete failure', async () => {
    mockDelete.mockRejectedValue(new ApiError('Forbidden', 403))

    const store = useTenantStore()
    const ok = await store.deleteTenant('x')

    expect(ok).toBe(false)
    expect(store.error).toBe('Forbidden')
  })

  // ------------------------------------------------------------------
  // toggleTenantStatus
  // ------------------------------------------------------------------

  it('toggles tenant status via updateTenant', async () => {
    const original = makeTenant({ status: 'active' })
    mockGet.mockResolvedValue(makePaginated([original]))

    const store = useTenantStore()
    await store.fetchTenants()

    const updated = makeTenant({ status: 'inactive' })
    mockPut.mockResolvedValue(updated)

    const result = await store.toggleTenantStatus('tenant-001', 'inactive')
    expect(result?.status).toBe('inactive')
    expect(mockPut).toHaveBeenCalledWith('/tenants/tenant-001', { status: 'inactive' })
  })

  // ------------------------------------------------------------------
  // clearError
  // ------------------------------------------------------------------

  it('clears error state', () => {
    const store = useTenantStore()
    // @ts-expect-error — directly set for test
    store.error = 'something'
    store.clearError()
    expect(store.error).toBe('')
  })
})
