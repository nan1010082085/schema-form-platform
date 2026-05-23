// @ts-nocheck
/**
 * useListData composable unit tests
 *
 * Covers:
 * - Initial state: empty tableData, total=0, loading=false
 * - handleSearch resets page to 1
 * - handleReset clears search params and resets page
 * - handlePageChange updates page
 * - handleSizeChange resets page to 1 and updates size
 * - filterEmptyParams removes null/undefined/empty string values
 * - getNestedValue extracts by dot path
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useListData } from '@/composables/useListData'
import type { ListApiConfig } from '@/components/WidgetRenderer/types'

/**
 * Mock apiClient from @/utils/apiClient.
 * We use vi.mock to replace it with a controlled stub.
 */
vi.mock('@/utils/apiClient', () => {
  const mockRequestUrl = vi.fn()
  return {
    apiClient: {
      requestUrl: mockRequestUrl,
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      configure: vi.fn(),
      isMockEnabled: vi.fn(() => false),
    },
    ApiError: class ApiError extends Error {
      constructor(msg, status) {
        super(msg)
        this.status = status
      }
    },
  }
})

import { apiClient } from '@/utils/apiClient'

/** Get the mocked requestUrl function */
function getMockRequestUrl() {
  return apiClient.requestUrl as unknown as ReturnType<typeof vi.fn>
}

describe('useListData', () => {
  const defaultListApi: ListApiConfig = {
    url: '/api/list',
    method: 'post',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------- initial state ----------

  describe('initial state', () => {
    it('returns empty tableData, total=0, loading=false', () => {
      const {
        tableData,
        total,
        loading,
        error,
        currentPage,
        pageSize,
      } = useListData({ listApi: defaultListApi, autoLoad: false })

      expect(tableData.value).toEqual([])
      expect(total.value).toBe(0)
      expect(loading.value).toBe(false)
      expect(error.value).toBe('')
      expect(currentPage.value).toBe(1)
      expect(pageSize.value).toBe(10)
    })

    it('respects custom pageSize', () => {
      const { pageSize } = useListData({
        listApi: defaultListApi,
        pageSize: 20,
        autoLoad: false,
      })
      expect(pageSize.value).toBe(20)
    })
  })

  // ---------- fetchData ----------

  describe('fetchData', () => {
    it('fetches data and populates tableData and total', async () => {
      const mockRequestUrl = getMockRequestUrl()
      mockRequestUrl.mockResolvedValue({
        data: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
        total: 2,
      })

      const { fetchData, tableData, total, loading } = useListData({
        listApi: defaultListApi,
        autoLoad: false,
      })

      expect(loading.value).toBe(false)

      const promise = fetchData()
      expect(loading.value).toBe(true)

      await flushPromises()
      await promise

      expect(loading.value).toBe(false)
      expect(tableData.value).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ])
      expect(total.value).toBe(2)
    })

    it('handles fetch errors gracefully', async () => {
      const mockRequestUrl = getMockRequestUrl()
      mockRequestUrl.mockRejectedValue(new Error('Network error'))

      const { fetchData, error, loading, tableData, total } = useListData({
        listApi: defaultListApi,
        autoLoad: false,
      })

      await fetchData()

      expect(loading.value).toBe(false)
      expect(error.value).toBe('Network error')
      expect(tableData.value).toEqual([])
      expect(total.value).toBe(0)
    })
  })

  // ---------- handleSearch ----------

  describe('handleSearch', () => {
    it('resets page to 1 by default', async () => {
      const mockRequestUrl = getMockRequestUrl()
      mockRequestUrl.mockResolvedValue({ data: [], total: 0 })

      const { handlePageChange, handleSearch, currentPage } = useListData({
        listApi: defaultListApi,
        autoLoad: false,
      })

      // Navigate to page 3
      handlePageChange(3)
      await flushPromises()
      expect(currentPage.value).toBe(3)

      // Search resets to page 1
      handleSearch()
      await flushPromises()
      expect(currentPage.value).toBe(1)
      // Verify the request was made with page 1
      const lastCall = mockRequestUrl.mock.calls[mockRequestUrl.mock.calls.length - 1]
      const params = lastCall[2] // third arg is params/body
      expect(params).toMatchObject({ pageNum: 1 })
    })

    it('does not reset page when resetOnSearch is false', async () => {
      const mockRequestUrl = getMockRequestUrl()
      mockRequestUrl.mockResolvedValue({ data: [], total: 0 })

      const { handlePageChange, handleSearch, currentPage } = useListData({
        listApi: { ...defaultListApi, resetOnSearch: false },
        autoLoad: false,
      })

      handlePageChange(3)
      await flushPromises()

      handleSearch()
      await flushPromises()

      // Page should still be 3
      expect(currentPage.value).toBe(3)
    })
  })

  // ---------- handleReset ----------

  describe('handleReset', () => {
    it('clears search params and resets page to 1', async () => {
      const mockRequestUrl = getMockRequestUrl()
      mockRequestUrl.mockResolvedValue({ data: [], total: 0 })

      const { handlePageChange, handleReset, searchParams, currentPage, setSearchParams } =
        useListData({ listApi: defaultListApi, autoLoad: false })

      // Set some params and navigate
      setSearchParams({ keyword: 'test', status: 'active' })
      handlePageChange(5)
      await flushPromises()

      // Reset
      handleReset()
      await flushPromises()

      expect(currentPage.value).toBe(1)
      // Search params should be cleared (undefined)
      expect(searchParams.keyword).toBeUndefined()
      expect(searchParams.status).toBeUndefined()
    })
  })

  // ---------- handlePageChange ----------

  describe('handlePageChange', () => {
    it('updates currentPage and fetches data', async () => {
      const mockRequestUrl = getMockRequestUrl()
      mockRequestUrl.mockResolvedValue({ data: [], total: 0 })

      const { handlePageChange, currentPage } = useListData({
        listApi: defaultListApi,
        autoLoad: false,
      })

      handlePageChange(3)
      await flushPromises()

      expect(currentPage.value).toBe(3)

      // Verify the request included the correct page
      const lastCall = mockRequestUrl.mock.calls[mockRequestUrl.mock.calls.length - 1]
      const params = lastCall[2]
      expect(params).toMatchObject({ pageNum: 3 })
    })
  })

  // ---------- handleSizeChange ----------

  describe('handleSizeChange', () => {
    it('resets page to 1 and updates pageSize', async () => {
      const mockRequestUrl = getMockRequestUrl()
      mockRequestUrl.mockResolvedValue({ data: [], total: 0 })

      const { handlePageChange, handleSizeChange, currentPage, pageSize } = useListData({
        listApi: defaultListApi,
        autoLoad: false,
      })

      // Navigate to page 5
      handlePageChange(5)
      await flushPromises()

      // Change page size
      handleSizeChange(50)
      await flushPromises()

      expect(pageSize.value).toBe(50)
      expect(currentPage.value).toBe(1)

      // Verify request contains the new page size
      const lastCall = mockRequestUrl.mock.calls[mockRequestUrl.mock.calls.length - 1]
      const params = lastCall[2]
      expect(params).toMatchObject({ pageNum: 1, pageSize: 50 })
    })
  })

  // ---------- filterEmptyParams (tested indirectly) ----------

  describe('filterEmptyParams (via fetchData)', () => {
    it('strips null/undefined/empty string values from request params', async () => {
      const mockRequestUrl = getMockRequestUrl()
      mockRequestUrl.mockResolvedValue({ data: [], total: 0 })

      const { setSearchParams, fetchData } = useListData({
        listApi: defaultListApi,
        autoLoad: false,
      })

      setSearchParams({
        keyword: 'hello',
        status: '', // empty string, should be filtered
        category: null, // null, should be filtered
        tag: undefined, // undefined, should be filtered
        active: true, // boolean, should be kept
      })

      await fetchData()

      const lastCall = mockRequestUrl.mock.calls[mockRequestUrl.mock.calls.length - 1]
      const params = lastCall[2] as Record<string, unknown>

      expect(params.keyword).toBe('hello')
      expect(params.active).toBe(true)
      // empty/null/undefined should NOT be in params
      expect('status' in params && params.status === '').toBe(false) // empty string removed
      expect(params.status).toBeUndefined()
      expect(params.category).toBeUndefined()
      expect(params.tag).toBeUndefined()
    })
  })

  // ---------- getNestedValue (tested indirectly via dataPath) ----------

  describe('getNestedValue (via dataPath/totalPath)', () => {
    it('extracts data by dot-path', async () => {
      const mockRequestUrl = getMockRequestUrl()
      mockRequestUrl.mockResolvedValue({
        result: {
          records: [{ id: 1 }, { id: 2 }],
          pagination: { totalCount: 100 },
        },
      })

      const { fetchData, tableData, total } = useListData({
        listApi: {
          ...defaultListApi,
          dataPath: 'result.records',
          totalPath: 'result.pagination.totalCount',
        },
        autoLoad: false,
      })

      await fetchData()

      expect(tableData.value).toEqual([{ id: 1 }, { id: 2 }])
      expect(total.value).toBe(100)
    })

    it('uses top-level properties when no dataPath specified', async () => {
      const mockRequestUrl = getMockRequestUrl()
      mockRequestUrl.mockResolvedValue({
        data: [{ id: 1 }],
        total: 1,
      })

      const { fetchData, tableData, total } = useListData({
        listApi: defaultListApi,
        autoLoad: false,
      })

      await fetchData()

      expect(tableData.value).toEqual([{ id: 1 }])
      expect(total.value).toBe(1)
    })
  })

  // ---------- selectedRows ----------

  describe('selectedRows', () => {
    it('updates selectedRows on selection change', () => {
      const { selectedRows, handleSelectionChange, clearSelection } = useListData({
        listApi: defaultListApi,
        autoLoad: false,
      })

      const rows = [{ id: 1, name: 'Alice' }]
      handleSelectionChange(rows)
      expect(selectedRows.value).toEqual(rows)

      clearSelection()
      expect(selectedRows.value).toEqual([])
    })
  })

  // ---------- setSearchParams ----------

  describe('setSearchParams', () => {
    it('merges search params incrementally', () => {
      const { searchParams, setSearchParams } = useListData({
        listApi: defaultListApi,
        autoLoad: false,
      })

      setSearchParams({ keyword: 'test' })
      expect(searchParams.keyword).toBe('test')

      setSearchParams({ status: 'active' })
      expect(searchParams.keyword).toBe('test') // preserved
      expect(searchParams.status).toBe('active')
    })
  })

  // ---------- handleSortChange ----------

  describe('handleSortChange', () => {
    it('fetches data with sort params', async () => {
      const mockRequestUrl = getMockRequestUrl()
      mockRequestUrl.mockResolvedValue({ data: [], total: 0 })

      const { handleSortChange } = useListData({
        listApi: defaultListApi,
        autoLoad: false,
      })

      handleSortChange({ prop: 'name', order: 'ascending' })
      await flushPromises()

      const lastCall = mockRequestUrl.mock.calls[mockRequestUrl.mock.calls.length - 1]
      const params = lastCall[2]
      expect(params).toMatchObject({
        sortField: 'name',
        sortOrder: 'ascending',
      })
    })
  })
})
