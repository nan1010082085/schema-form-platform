/**
 * List data composable for search-list component
 * Manages list data lifecycle: fetching, pagination, search, sort, selection
 */
import { ref, reactive, onMounted } from 'vue'
import type { Ref } from 'vue'
import { fetchGenericList } from '@/api/dataApi'
import type { ListApiConfig } from '@/components/WidgetRenderer/types'

export interface UseListDataOptions {
  listApi: ListApiConfig
  pageSize?: number
  autoLoad?: boolean
  enableRetry?: boolean
  retryCount?: number
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
      const { data, total: totalVal } = await fetchGenericList(
        listApi,
        {
          page: currentPage.value,
          pageSize: pageSize.value,
          searchParams,
          extraParams: listApi.extraParams,
          sortField: sortState.prop || undefined,
          sortOrder: sortState.order || undefined,
        },
        { enableRetry: options.enableRetry, maxRetries: options.retryCount },
      )

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
