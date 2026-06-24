/**
 * useCredentialStore -- Credential management state
 *
 * Responsibilities:
 * - Credential list fetch, pagination, search, type filter
 * - CRUD operations for credentials
 */
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { ApiError } from '@/utils/apiClient'
import type { PaginatedResponse } from '@/types/api'
import type {
  CredentialItem,
  CredentialDetail,
  CredentialType,
  CredentialCreatePayload,
  CredentialUpdatePayload,
} from '@/types/credential'
import {
  fetchCredentials as apiFetchCredentials,
  fetchCredentialById as apiFetchCredentialById,
  createCredential as apiCreateCredential,
  updateCredential as apiUpdateCredential,
  deleteCredential as apiDeleteCredential,
} from '@/api/dataApi'

const DEFAULT_PAGE_SIZE = 20

export const useCredentialStore = defineStore('credential', () => {
  const credentials = ref<CredentialItem[]>([])
  const loading = ref(false)
  const error = ref('')
  const searchQuery = ref('')
  const typeFilter = ref<CredentialType | ''>('')
  const pagination = reactive({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })

  const hasCredentials = computed(() => credentials.value.length > 0)
  const isEmpty = computed(() => !loading.value && credentials.value.length === 0)
  const hasError = computed(() => error.value !== '')

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

  async function fetchCredentials(params?: {
    page?: number
    pageSize?: number
    search?: string
    type?: CredentialType | ''
  }): Promise<PaginatedResponse<CredentialItem> | null> {
    const page = params?.page ?? pagination.page
    const pageSize = params?.pageSize ?? pagination.pageSize
    const search = params?.search ?? searchQuery.value
    const type = params?.type ?? typeFilter.value

    const queryParams: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize),
    }
    if (search) queryParams.search = search
    if (type) queryParams.type = type

    const result = await withLoading(() =>
      apiFetchCredentials({ page, pageSize, search: search || undefined, type: type || undefined }),
    )

    if (result) {
      credentials.value = result.items
      pagination.total = result.total
      pagination.page = result.page
      pagination.pageSize = result.pageSize
      pagination.totalPages = result.totalPages
      if (params?.search !== undefined) searchQuery.value = params.search
      if (params?.type !== undefined) typeFilter.value = params.type
    }

    return result
  }

  async function fetchCredentialById(id: string): Promise<CredentialDetail | null> {
    return withLoading(() => apiFetchCredentialById(id))
  }

  async function createCredential(payload: CredentialCreatePayload): Promise<CredentialItem | null> {
    const result = await withLoading(() => apiCreateCredential(payload))
    if (result) await fetchCredentials({ page: 1 })
    return result
  }

  async function updateCredential(id: string, payload: CredentialUpdatePayload): Promise<CredentialItem | null> {
    const result = await withLoading(() => apiUpdateCredential(id, payload))
    if (result) {
      const idx = credentials.value.findIndex((c) => c.id === id)
      if (idx >= 0) credentials.value[idx] = result
    }
    return result
  }

  async function deleteCredential(id: string): Promise<boolean> {
    clearError()
    try {
      await apiDeleteCredential(id)
      credentials.value = credentials.value.filter((c) => c.id !== id)
      pagination.total = Math.max(0, pagination.total - 1)
      pagination.totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
      if (credentials.value.length === 0 && pagination.page > 1) {
        await fetchCredentials({ page: pagination.page - 1 })
      }
      return true
    } catch (e: unknown) {
      if (e instanceof ApiError) setError(e.message)
      else if (e instanceof Error) setError(e.message)
      else setError('An unexpected error occurred')
      return false
    }
  }

  return {
    credentials,
    loading,
    error,
    searchQuery,
    typeFilter,
    pagination,
    hasCredentials,
    isEmpty,
    hasError,
    fetchCredentials,
    fetchCredentialById,
    createCredential,
    updateCredential,
    deleteCredential,
    clearError,
  }
})
