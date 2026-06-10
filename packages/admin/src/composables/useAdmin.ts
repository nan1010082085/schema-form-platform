import { ref, computed } from 'vue'
import { apiClient } from '@/utils/apiClient'

/**
 * 通用分页查询 composable
 */
export function usePagedQuery<T>(endpoint: string) {
  const items = ref<T[]>([]) as { value: T[] }
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)

  async function fetch(extraParams?: Record<string, string>) {
    loading.value = true
    try {
      const params = new URLSearchParams()
      params.set('page', String(page.value))
      params.set('pageSize', String(pageSize.value))
      if (extraParams) {
        for (const [key, value] of Object.entries(extraParams)) {
          if (value) params.set(key, value)
        }
      }
      const res = await apiClient.get<{ items: T[]; total: number }>(`/api${endpoint}?${params}`)
      items.value = res.items
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  function handlePageChange(p: number) {
    page.value = p
    fetch()
  }

  function handleSizeChange(size: number) {
    pageSize.value = size
    page.value = 1
    fetch()
  }

  return {
    items,
    total,
    page,
    pageSize,
    loading,
    fetch,
    handlePageChange,
    handleSizeChange,
  }
}

/**
 * 通用 CRUD 对话框 composable
 */
export function useCrudDialog<T extends Record<string, unknown>>(defaultForm: T) {
  const visible = ref(false)
  const mode = ref<'create' | 'edit'>('create')
  const form = ref<T>({ ...defaultForm }) as { value: T }
  const editingId = ref('')

  function openCreate() {
    mode.value = 'create'
    form.value = { ...defaultForm }
    visible.value = true
  }

  function openEdit(item: T & { id: string }) {
    mode.value = 'edit'
    editingId.value = item.id
    form.value = { ...item }
    visible.value = true
  }

  function close() {
    visible.value = false
  }

  return {
    visible,
    mode,
    form,
    editingId,
    openCreate,
    openEdit,
    close,
  }
}

/**
 * 通用树形数据查询 composable
 */
export function useTreeQuery<T extends { id: string; children?: T[] }>(endpoint: string) {
  const tree = ref<T[]>([]) as { value: T[] }
  const loading = ref(false)
  const expandedKeys = ref<string[]>([])

  async function fetch() {
    loading.value = true
    try {
      const data = await apiClient.get<T[]>(`${endpoint}?tree=true`)
      tree.value = Array.isArray(data) ? data : []
      expandedKeys.value = tree.value.map(item => item.id)
    } finally {
      loading.value = false
    }
  }

  function flatten(nodes: T[]): T[] {
    const result: T[] = []
    for (const node of nodes) {
      result.push(node)
      if (node.children?.length) {
        result.push(...flatten(node.children as T[]))
      }
    }
    return result
  }

  const flatList = computed(() => flatten(tree.value))

  return {
    tree,
    loading,
    expandedKeys,
    flatList,
    fetch,
  }
}
