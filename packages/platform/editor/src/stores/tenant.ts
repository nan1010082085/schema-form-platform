/**
 * useTenantStore — 租户管理状态
 *
 * 职责：
 * - 租户列表的获取、分页、搜索、状态筛选
 * - 租户的创建、更新、删除、启停用
 */
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { ApiError } from '@/utils/apiClient'
import type { PaginatedResponse } from '@/types/api'
import type {
  TenantItem,
  TenantStatus,
  TenantCreatePayload,
  TenantUpdatePayload,
} from '@/types/tenant'
import {
  fetchTenants as apiFetchTenants,
  createTenant as apiCreateTenant,
  updateTenant as apiUpdateTenant,
  deleteTenant as apiDeleteTenant,
} from '@/api/dataApi'

const DEFAULT_PAGE_SIZE = 20

export const useTenantStore = defineStore('tenant', () => {
  // ── 状态 ──
  const tenants = ref<TenantItem[]>([])
  const loading = ref(false)
  const error = ref('')
  const searchQuery = ref('')
  const statusFilter = ref<TenantStatus | ''>('')
  const pagination = reactive({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })

  // ── 计算属性 ──
  const hasTenants = computed(() => tenants.value.length > 0)
  const isEmpty = computed(() => !loading.value && tenants.value.length === 0)
  const hasError = computed(() => error.value !== '')

  // ── 内部工具 ──
  function setError(message: string) {
    error.value = message
    loading.value = false
  }

  function clearError() {
    error.value = ''
  }

  async function withLoading<T>(fn: () => Promise<T>): Promise<T | null> {
    loading.value = true
    clearError()
    try {
      return await fn()
    } catch (e: unknown) {
      if (e instanceof ApiError) setError(e.message)
      else if (e instanceof Error) setError(e.message)
      else setError('An unexpected error occurred')
      return null
    } finally {
      loading.value = false
    }
  }

  // ── 列表操作 ──
  async function fetchTenants(params?: {
    page?: number
    pageSize?: number
    search?: string
    status?: TenantStatus | ''
  }): Promise<PaginatedResponse<TenantItem> | null> {
    const page = params?.page ?? pagination.page
    const pageSize = params?.pageSize ?? pagination.pageSize
    const search = params?.search ?? searchQuery.value
    const status = params?.status ?? statusFilter.value

    const queryParams: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize),
    }
    if (search) queryParams.search = search
    if (status) queryParams.status = status

    const result = await withLoading(() =>
      apiFetchTenants({ page, pageSize, search: search || undefined, status: status || undefined }),
    )

    if (result) {
      tenants.value = result.items
      pagination.total = result.total
      pagination.page = result.page
      pagination.pageSize = result.pageSize
      pagination.totalPages = result.totalPages
      if (params?.search !== undefined) searchQuery.value = params.search
      if (params?.status !== undefined) statusFilter.value = params.status
    }

    return result
  }

  // ── CRUD ──
  async function createTenant(payload: TenantCreatePayload): Promise<TenantItem | null> {
    const result = await withLoading(() => apiCreateTenant(payload))
    if (result) await fetchTenants({ page: 1 })
    return result
  }

  async function updateTenant(id: string, payload: TenantUpdatePayload): Promise<TenantItem | null> {
    const result = await withLoading(() => apiUpdateTenant(id, payload))
    if (result) {
      const idx = tenants.value.findIndex((t) => t.id === id)
      if (idx >= 0) tenants.value[idx] = result
    }
    return result
  }

  async function deleteTenant(id: string): Promise<boolean> {
    clearError()
    try {
      await apiDeleteTenant(id)
      tenants.value = tenants.value.filter((t) => t.id !== id)
      pagination.total = Math.max(0, pagination.total - 1)
      pagination.totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
      if (tenants.value.length === 0 && pagination.page > 1) {
        await fetchTenants({ page: pagination.page - 1 })
      }
      return true
    } catch (e: unknown) {
      if (e instanceof ApiError) setError(e.message)
      else if (e instanceof Error) setError(e.message)
      else setError('An unexpected error occurred')
      return false
    }
  }

  async function toggleTenantStatus(id: string, newStatus: TenantStatus): Promise<TenantItem | null> {
    return updateTenant(id, { status: newStatus })
  }

  return {
    tenants,
    loading,
    error,
    searchQuery,
    statusFilter,
    pagination,
    hasTenants,
    isEmpty,
    hasError,
    fetchTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    toggleTenantStatus,
    clearError,
  }
})
