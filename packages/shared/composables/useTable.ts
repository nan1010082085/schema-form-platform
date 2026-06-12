/**
 * useTable - 公共表格管理
 */
import { ref, type Ref } from 'vue'

interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export function useTable<T>(fetchFn: (params: Record<string, unknown>) => Promise<PaginatedResult<T>>) {
  const data = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const page = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const searchQuery = ref('')

  async function fetchData() {
    loading.value = true
    try {
      const params: Record<string, unknown> = {
        page: page.value,
        pageSize: pageSize.value,
      }
      if (searchQuery.value) {
        params.search = searchQuery.value
      }
      const result = await fetchFn(params)
      data.value = result.items
      total.value = result.total
    } finally {
      loading.value = false
    }
  }

  function handlePageChange(p: number) {
    page.value = p
    fetchData()
  }

  function handleSizeChange(size: number) {
    pageSize.value = size
    page.value = 1
    fetchData()
  }

  function handleSearch() {
    page.value = 1
    fetchData()
  }

  function refresh() {
    fetchData()
  }

  return {
    data,
    loading,
    page,
    pageSize,
    total,
    searchQuery,
    fetchData,
    handlePageChange,
    handleSizeChange,
    handleSearch,
    refresh,
  }
}
