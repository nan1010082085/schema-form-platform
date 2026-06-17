/**
 * useTemplateStore — 组件模板库状态管理
 *
 * 职责：
 * - 模板列表的获取、搜索、筛选、分页
 * - 模板的应用（获取 widgets 并返回）
 * - 模板的创建（从画布保存）
 * - 模板的删除
 *
 * 所有 API 调用通过 apiClient 中的 fetchTemplates / applyTemplate / createTemplate / deleteTemplate。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  fetchTemplates,
  applyTemplate,
  createTemplate,
  deleteTemplate,
} from '@/utils/apiClient'
import type { TemplateItem, TemplateCategory } from '@/utils/apiClient'

export const useTemplateStore = defineStore('template', () => {
  // ================================================================
  // 数据
  // ================================================================

  const templates = ref<TemplateItem[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ================================================================
  // 筛选 / 分页
  // ================================================================

  const searchKeyword = ref('')
  const selectedCategory = ref('')
  const page = ref(1)
  const pageSize = ref(20)

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
  const hasMore = computed(() => page.value < totalPages.value)

  // ================================================================
  // 加载模板
  // ================================================================

  async function loadTemplates(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await fetchTemplates({
        search: searchKeyword.value || undefined,
        category: selectedCategory.value || undefined,
        page: page.value,
        pageSize: pageSize.value,
      })
      templates.value = res.items
      total.value = res.total
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载模板失败'
      templates.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  // ================================================================
  // 搜索 / 筛选操作
  // ================================================================

  function setSearch(keyword: string): void {
    searchKeyword.value = keyword
    page.value = 1
  }

  function setCategory(category: string): void {
    selectedCategory.value = category
    page.value = 1
  }

  function setPage(newPage: number): void {
    page.value = newPage
  }

  function resetFilters(): void {
    searchKeyword.value = ''
    selectedCategory.value = ''
    page.value = 1
  }

  // ================================================================
  // 应用模板
  // ================================================================

  async function applyTemplateById(id: string): Promise<Record<string, unknown>[]> {
    const result = await applyTemplate(id)
    // 刷新列表以更新 usageCount
    loadTemplates()
    return result.widgets
  }

  // ================================================================
  // 创建模板
  // ================================================================

  async function saveTemplate(payload: {
    name: string
    description?: string
    category?: TemplateCategory
    widgets: Record<string, unknown>[]
    tags?: string[]
    thumbnail?: string
  }): Promise<TemplateItem> {
    const template = await createTemplate(payload)
    // 刷新列表
    loadTemplates()
    return template
  }

  // ================================================================
  // 删除模板
  // ================================================================

  async function removeTemplate(id: string): Promise<void> {
    await deleteTemplate(id)
    // 刷新列表
    loadTemplates()
  }

  // ================================================================
  // 导出
  // ================================================================

  return {
    // 数据
    templates,
    total,
    loading,
    error,
    // 筛选 / 分页
    searchKeyword,
    selectedCategory,
    page,
    pageSize,
    totalPages,
    hasMore,
    // 方法
    loadTemplates,
    setSearch,
    setCategory,
    setPage,
    resetFilters,
    applyTemplateById,
    saveTemplate,
    removeTemplate,
  }
})
