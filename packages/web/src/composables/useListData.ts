/**
 * List data composable for search-list component
 * Manages list data lifecycle: fetching, pagination, search, sort, selection
 */
import { ref, reactive, onMounted } from 'vue'
import type { Ref } from 'vue'
import { getRequestInstance } from '@/utils/request'
import type { ListApiConfig } from '@/components/FormGrid/types'
import { normalizeListResponse } from '@/utils/responseNormalizer'

export interface UseListDataOptions {
  listApi: ListApiConfig
  pageSize?: number
  autoLoad?: boolean
}

export interface UseListDataReturn {
  tableData: Ref<Record<string, unknown>[]>
  total: Ref<number>
  loading: Ref<boolean>
  error: Ref<string>
  currentPage: Ref<number>
  pageSize: Ref<number>
  searchParams: Record<string, unknown>
  setSearchParams: (params: Record<string, unknown>) => void
  fetchData: () => Promise<void>
  handleSearch: () => void
  handleReset: () => void
  handlePageChange: (page: number) => void
  handleSizeChange: (size: number) => void
  handleSortChange: (sort: { prop: string; order: string }) => void
  selectedRows: Ref<Record<string, unknown>[]>
  handleSelectionChange: (rows: Record<string, unknown>[]) => void
  clearSelection: () => void
}


/** Filter out undefined, null, and empty string values */
function filterEmptyParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value
    }
  }
  return result
}

export function useListData(options: UseListDataOptions): UseListDataReturn {
  const { listApi, pageSize: defaultPageSize = 10, autoLoad = true } = options

  // State
  const tableData = ref<Record<string, unknown>[]>([]) as Ref<Record<string, unknown>[]>
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const currentPage = ref(1)
  const pageSize = ref(defaultPageSize)
  const searchParams = reactive<Record<string, unknown>>({})
  const sortState = reactive({ prop: '', order: '' })
  const selectedRows = ref<Record<string, unknown>[]>([]) as Ref<Record<string, unknown>[]>

  async function fetchData(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const request = getRequestInstance()
      const params: Record<string, unknown> = {
        [listApi.pageParam ?? 'pageNum']: currentPage.value,
        [listApi.sizeParam ?? 'pageSize']: pageSize.value,
        ...filterEmptyParams(searchParams),
        ...(listApi.extraParams ?? {}),
      }
      if (sortState.prop) {
        params.sortField = sortState.prop
        params.sortOrder = sortState.order
      }

      const method = listApi.method ?? 'post'
      const response: unknown = method === 'get'
        ? await request.get(listApi.url, { params })
        : await request.post(listApi.url, params)

      const { data, total: totalVal } = normalizeListResponse(response, {
        dataPath: listApi.dataPath ?? 'data',
        totalPath: listApi.totalPath ?? 'total',
      })

      tableData.value = data
      total.value = totalVal
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Request failed'
      tableData.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  function handleSearch(): void {
    if (listApi.resetOnSearch !== false) {
      currentPage.value = 1
    }
    fetchData()
  }

  function handleReset(): void {
    Object.keys(searchParams).forEach(key => { searchParams[key] = undefined })
    currentPage.value = 1
    sortState.prop = ''
    sortState.order = ''
    fetchData()
  }

  function handlePageChange(page: number): void {
    currentPage.value = page
    fetchData()
  }

  function handleSizeChange(size: number): void {
    pageSize.value = size
    currentPage.value = 1
    fetchData()
  }

  function handleSortChange(sort: { prop: string; order: string }): void {
    sortState.prop = sort.prop
    sortState.order = sort.order
    fetchData()
  }

  function handleSelectionChange(rows: Record<string, unknown>[]): void {
    selectedRows.value = rows
  }

  function clearSelection(): void {
    selectedRows.value = []
  }

  function setSearchParams(params: Record<string, unknown>): void {
    Object.assign(searchParams, params)
  }

  onMounted(() => {
    if (autoLoad && listApi.immediate !== false) {
      fetchData()
    }
  })

  return {
    tableData,
    total,
    loading,
    error,
    currentPage,
    pageSize,
    searchParams,
    setSearchParams,
    fetchData,
    handleSearch,
    handleReset,
    handlePageChange,
    handleSizeChange,
    handleSortChange,
    selectedRows,
    handleSelectionChange,
    clearSelection,
  }
}
