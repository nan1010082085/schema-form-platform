/**
 * useSchemaStore — Schema CRUD 与 API 交互状态管理
 *
 * 负责：
 * - Schema 清单的获取、分页、搜索
 * - Schema 详情的加载、创建、更新、删除
 * - 与 useEditorStore 协作：加载 schema 到编辑器 / 从编辑器保存
 *
 * 设计原则：
 * - 异步操作用 loading/error 模式管理
 * - 分页状态与搜索词独立管理，互不干扰
 * - 与 apiClient 解耦：依赖 configureApiClient() 完成初始化
 */
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type {
  SchemaListItem,
  PaginatedResponse,
  PublishedSchemaItem,
  SchemaCreatePayload,
  SchemaUpdatePayload,
} from '@/types/api'
import type { FormSchemaItem } from '@/components/FormGrid/types'
import { ApiError } from '@/utils/apiClient'
import {
  fetchSchemas as apiFetchSchemas,
  fetchSchemaById as apiFetchSchemaById,
  createSchema as apiCreateSchema,
  updateSchema as apiUpdateSchema,
  deleteSchema as apiDeleteSchema,
  publishSchema as apiPublishSchema,
  fetchPublishedSchema as apiFetchPublishedSchema,
} from '@/utils/apiClient'
import { useEditorStore } from './editor'

/** 默认分页大小 */
const DEFAULT_PAGE_SIZE = 20

export const useSchemaStore = defineStore('schema', () => {
  // ================================================================
  // 状态
  // ================================================================

  /** Schema 清单（分页列表） */
  const schemas = ref<SchemaListItem[]>([])

  /** 当前查看/编辑的单个 Schema 详情 */
  const currentSchema = ref<SchemaListItem | null>(null)

  /** 加载中标志 */
  const loading = ref(false)

  /** 最近一次错误信息 */
  const error = ref('')

  /** 搜索关键词 */
  const searchQuery = ref('')

  /** 分页状态 */
  const pagination = reactive({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })

  // ================================================================
  // 计算属性
  // ================================================================

  /** 是否有已加载的清单 */
  const hasSchemas = computed(() => schemas.value.length > 0)

  /** 清单是否为空（加载完成且无数据） */
  const isEmpty = computed(() => !loading.value && schemas.value.length === 0)

  /** 是否有错误 */
  const hasError = computed(() => error.value !== '')

  // ================================================================
  // 内部工具
  // ================================================================

  /** 设置错误并重置 loading */
  function setError(message: string): void {
    error.value = message
    loading.value = false
  }

  /** 清除错误 */
  function clearError(): void {
    error.value = ''
  }

  /**
   * 安全包装异步操作：统一管理 loading/error 状态。
   *
   * @param fn - 要执行的异步函数
   * @returns 函数的返回值，失败时返回 null
   */
  async function withLoading<T>(fn: () => Promise<T>): Promise<T | null> {
    loading.value = true
    clearError()
    try {
      return await fn()
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('An unexpected error occurred')
      }
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 安全包装异步操作：不设置全局 loading，仅捕获错误。
   * 用于静默操作（如后台刷新）。
   */
  async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T | null> {
    clearError()
    try {
      return await fn()
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('An unexpected error occurred')
      }
      return null
    }
  }

  // ================================================================
  // Schema 清单操作
  // ================================================================

  /**
   * 获取 Schema 分页列表。
   *
   * @param params - 可覆盖当前 pagination/searchQuery 状态
   */
  async function fetchSchemas(params?: {
    page?: number
    pageSize?: number
    search?: string
    type?: string
  }): Promise<PaginatedResponse<SchemaListItem> | null> {
    const page = params?.page ?? pagination.page
    const pageSize = params?.pageSize ?? pagination.pageSize
    const search = params?.search ?? searchQuery.value

    const result = await withLoading(() =>
      apiFetchSchemas({
        search: search || undefined,
        page,
        pageSize,
        type: params?.type,
      }),
    )

    if (result) {
      schemas.value = result.items
      pagination.total = result.total
      pagination.page = result.page
      pagination.pageSize = result.pageSize
      pagination.totalPages = result.totalPages
      // 同步搜索词回 store
      if (params?.search !== undefined) {
        searchQuery.value = params.search
      }
    }

    return result
  }

  /**
   * 跳转到指定页。
   */
  async function goToPage(page: number): Promise<void> {
    if (page < 1 || page > pagination.totalPages) return
    await fetchSchemas({ page })
  }

  /**
   * 修改每页条数并重新加载首页。
   */
  async function setPageSize(pageSize: number): Promise<void> {
    await fetchSchemas({ page: 1, pageSize })
  }

  /**
   * 按关键词搜索并重置到首页。
   */
  async function search(search: string): Promise<void> {
    searchQuery.value = search
    await fetchSchemas({ page: 1, search })
  }

  /**
   * 清除搜索并重新加载。
   */
  async function clearSearch(): Promise<void> {
    searchQuery.value = ''
    await fetchSchemas({ page: 1, search: '' })
  }

  // ================================================================
  // 单 Schema 操作
  // ================================================================

  /**
   * 根据 ID 获取 Schema 详情（含完整 JSON）。
   */
  async function fetchSchemaById(id: string): Promise<SchemaListItem | null> {
    const result = await withLoading(() => apiFetchSchemaById(id))
    if (result) {
      currentSchema.value = result
    }
    return result
  }

  /**
   * 创建新 Schema。
   *
   * @returns 创建成功的 Schema，失败返回 null
   */
  async function createSchema(
    payload: SchemaCreatePayload,
  ): Promise<SchemaListItem | null> {
    const result = await withLoading(() => apiCreateSchema(payload))
    if (result) {
      // 创建成功后刷新列表
      await fetchSchemas()
      currentSchema.value = result
    }
    return result
  }

  /**
   * 更新 Schema。
   *
   * @param id      - Schema ID
   * @param payload - 要更新的字段
   * @returns 更新后的 Schema，失败返回 null
   */
  async function updateSchema(
    id: string,
    payload: SchemaUpdatePayload,
  ): Promise<SchemaListItem | null> {
    const result = await withLoading(() => apiUpdateSchema(id, payload))
    if (result) {
      currentSchema.value = result
      // 同步更新清单中的同名项
      const idx = schemas.value.findIndex((s) => s.id === id)
      if (idx >= 0) {
        schemas.value[idx] = result
      }
    }
    return result
  }

  /**
   * 删除 Schema。
   *
   * @returns 是否成功删除
   */
  async function deleteSchema(id: string): Promise<boolean> {
    const result = await withErrorHandling(() => apiDeleteSchema(id))
    if (result !== null) {
      // 从清单中移除
      schemas.value = schemas.value.filter((s) => s.id !== id)
      if (currentSchema.value?.id === id) {
        currentSchema.value = null
      }
      // 更新分页计数
      pagination.total = Math.max(0, pagination.total - 1)
      pagination.totalPages = Math.max(
        1,
        Math.ceil(pagination.total / pagination.pageSize),
      )
      // 若当前页无数据且非首页，回退一页
      if (schemas.value.length === 0 && pagination.page > 1) {
        await goToPage(pagination.page - 1)
      }
      return true
    }
    return false
  }

  /**
   * 保存 schema 到后端。
   *
   * 重载 1: 从 editorStore 读取（现有编辑器集成）
   * @param name     - Schema 名称
   * @param schemaId - 可选：要更新的 Schema ID
   *
   * 重载 2: 直接传入 schema 数组（EditorView 本地 ref 模式）
   * @param schema   - 要保存的 FormSchemaItem 数组
   * @param name     - Schema 名称
   * @param schemaId - 可选：要更新的 Schema ID
   *
   * @returns 保存后的 Schema，失败返回 null
   */
  async function saveFromEditor(schema: FormSchemaItem[], name: string, schemaId?: string): Promise<SchemaListItem | null>
  async function saveFromEditor(name: string, schemaId?: string): Promise<SchemaListItem | null>
  async function saveFromEditor(
    nameOrSchema: string | FormSchemaItem[],
    nameOrId?: string,
    schemaId?: string,
  ): Promise<SchemaListItem | null> {
    let json: FormSchemaItem[]
    let name: string
    let id: string | undefined

    if (Array.isArray(nameOrSchema)) {
      // 重载 2: 调用方直接传入 schema 数组
      json = nameOrSchema
      name = nameOrId!
      id = schemaId
    } else {
      // 重载 1: 从 editorStore 读取
      const editorStore = useEditorStore()
      json = editorStore.schema
      name = nameOrSchema
      id = nameOrId
    }

    if (id) {
      return updateSchema(id, { name, json })
    } else {
      return createSchema({ name, type: "form" as const, json })
    }
  }

  /**
   * 从后端加载 Schema 并填充到编辑器（现有 editorStore 集成）。
   *
   * @param id - Schema ID
   * @returns 是否加载成功
   */
  async function loadIntoEditor(id: string): Promise<boolean>
  /**
   * 将已加载的 schema 数据传入（EditorView 本地 ref 模式，passthrough）。
   *
   * @param schema - 已从后端获取的 FormSchemaItem 数组
   * @returns 传入的 schema（供调用方赋值到本地 ref）
   */
  function loadIntoEditor(schema: FormSchemaItem[]): FormSchemaItem[]
  function loadIntoEditor(
    idOrSchema: string | FormSchemaItem[],
  ): Promise<boolean> | FormSchemaItem[] {
    if (typeof idOrSchema === 'string') {
      // 重载 1: 从服务器按 ID 加载，推送到 editorStore
      return (async () => {
        const detail = await fetchSchemaById(idOrSchema)
        if (!detail) return false

        const editorStore = useEditorStore()
        editorStore.importSchema(detail.json!)
        editorStore.clearHistory()
        // 记录第一个快照（加载后的初始状态）
        editorStore.pushState()

        return true
      })()
    }
    // 重载 2: passthrough — 调用方自行赋值到本地 ref
    return idOrSchema
  }

  // ================================================================
  // 发布操作
  // ================================================================

  /**
   * 发布 Schema — 将当前草稿写入 PublishedSchema 表（upsert）。
   *
   * @param id - FormSchema ID
   * @returns 发布后的 PublishedSchema，失败返回 null
   */
  async function publishSchema(id: string): Promise<PublishedSchemaItem | null> {
    return withLoading(() => apiPublishSchema(id))
  }

  /**
   * 获取已发布的 Schema（按源 FormSchema ID 查询）。
   *
   * @param sourceId - FormSchema ID
   * @returns PublishedSchema，未发布或失败返回 null
   */
  async function fetchPublishedSchema(sourceId: string): Promise<PublishedSchemaItem | null> {
    return withErrorHandling(() => apiFetchPublishedSchema(sourceId))
  }

  return {
    // 状态
    schemas,
    currentSchema,
    loading,
    error,
    searchQuery,
    pagination,
    // 计算属性
    hasSchemas,
    isEmpty,
    hasError,
    // 清单操作
    fetchSchemas,
    goToPage,
    setPageSize,
    search,
    clearSearch,
    // 单 Schema CRUD
    fetchSchemaById,
    createSchema,
    updateSchema,
    deleteSchema,
    // 编辑器交互
    saveFromEditor,
    loadIntoEditor,
    // 发布操作
    publishSchema,
    fetchPublishedSchema,
    // 错误管理
    clearError,
  }
})
