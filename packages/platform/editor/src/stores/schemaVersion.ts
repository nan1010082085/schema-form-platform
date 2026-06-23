/**
 * useSchemaVersionStore — Schema 版本管理状态
 *
 * 职责：
 * - 版本列表的获取与分页
 * - 版本详情加载
 * - 两个版本间的 diff 计算
 * - 版本回滚
 *
 * 设计原则：
 * - 纯版本管理，不持有画布状态
 * - 异步操作用 loading/error 模式管理
 * - 与 apiClient 解耦：调用 apiClient 中已有的版本 API
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VersionEntry, SchemaDetail } from '@/types/api'
import type { DiffResult } from '@/utils/schemaDiff'
import { ApiError } from '@/utils/apiClient'
import {
  fetchVersions as apiFetchVersions,
  fetchVersion as apiFetchVersion,
  deleteVersion as apiDeleteVersion,
} from '@/utils/apiClient'
import { diffSchema, getDiffSummary } from '@/utils/schemaDiff'
import { parseSchemaJson } from '@/utils/parseSchemaJson'

export const useSchemaVersionStore = defineStore('schemaVersion', () => {
  // ================================================================
  // 状态
  // ================================================================

  /** 版本列表 */
  const versions = ref<VersionEntry[]>([])

  /** 当前版本号 */
  const currentVersion = ref('')

  /** editId — 版本查询主键 */
  const editId = ref('')

  /** 加载中标志 */
  const loading = ref(false)

  /** 最近一次错误信息 */
  const error = ref('')

  /** 分页 */
  const page = ref(1)
  const pageSize = ref(20)
  const total = ref(0)

  /** 选中对比的两个版本 */
  const compareLeft = ref<string>('')
  const compareRight = ref<string>('')

  /** 对比的两个版本详情 */
  const leftDetail = ref<SchemaDetail | null>(null)
  const rightDetail = ref<SchemaDetail | null>(null)

  /** diff 结果 */
  const diffResult = ref<DiffResult | null>(null)

  /** 对比详情加载中 */
  const compareLoading = ref(false)

  // ================================================================
  // 计算属性
  // ================================================================

  const hasVersions = computed(() => versions.value.length > 0)

  const isEmpty = computed(() => !loading.value && versions.value.length === 0)

  const hasError = computed(() => error.value !== '')

  /** 是否已选中两个版本 */
  const canCompare = computed(() => !!compareLeft.value && !!compareRight.value)

  /** diff 摘要 */
  const diffSummary = computed(() => {
    if (!diffResult.value) return ''
    return getDiffSummary(diffResult.value)
  })

  /** 是否有差异 */
  const hasDiff = computed(() => {
    if (!diffResult.value) return false
    const { added, removed, modified, moved } = diffResult.value
    return added.length > 0 || removed.length > 0 || modified.length > 0 || moved.length > 0
  })

  // ================================================================
  // 内部工具
  // ================================================================

  function setError(message: string): void {
    error.value = message
    loading.value = false
  }

  function clearError(): void {
    error.value = ''
  }

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

  // ================================================================
  // 版本列表操作
  // ================================================================

  /**
   * 设置当前 editId 并加载版本列表。
   */
  async function init(editIdParam: string, currentVersionParam?: string): Promise<void> {
    editId.value = editIdParam
    if (currentVersionParam) {
      currentVersion.value = currentVersionParam
    }
    await loadVersions(1)
  }

  /**
   * 加载版本列表。
   */
  async function loadVersions(targetPage = 1): Promise<void> {
    if (!editId.value) return

    const result = await withLoading(() =>
      apiFetchVersions(editId.value, targetPage, pageSize.value),
    )

    if (result) {
      versions.value = result.items
      total.value = result.total ?? 0
      page.value = targetPage
    }
  }

  /**
   * 翻页。
   */
  async function goToPage(targetPage: number): Promise<void> {
    await loadVersions(targetPage)
  }

  // ================================================================
  // 版本对比操作
  // ================================================================

  /**
   * 选择要对比的版本。
   */
  function selectForCompare(version: string, side: 'left' | 'right'): void {
    if (side === 'left') {
      compareLeft.value = version
    } else {
      compareRight.value = version
    }
    // 自动清空旧的 diff 结果
    diffResult.value = null
  }

  /**
   * 清除选择。
   */
  function clearCompare(): void {
    compareLeft.value = ''
    compareRight.value = ''
    leftDetail.value = null
    rightDetail.value = null
    diffResult.value = null
  }

  /**
   * 执行版本对比。
   * 加载两个版本的完整 Schema，然后调用 diffSchema 计算差异。
   */
  async function executeCompare(): Promise<boolean> {
    if (!compareLeft.value || !compareRight.value) return false
    if (!editId.value) return false

    compareLoading.value = true
    clearError()

    try {
      const [left, right] = await Promise.all([
        apiFetchVersion(editId.value, compareLeft.value),
        apiFetchVersion(editId.value, compareRight.value),
      ])

      leftDetail.value = left
      rightDetail.value = right

      const { widgets: leftWidgets } = parseSchemaJson(left.json)
      const { widgets: rightWidgets } = parseSchemaJson(right.json)

      diffResult.value = diffSchema(leftWidgets, rightWidgets)
      return true
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('对比失败')
      }
      return false
    } finally {
      compareLoading.value = false
    }
  }

  // ================================================================
  // 版本回滚
  // ================================================================

  /**
   * 回滚到指定版本（加载该版本的 Schema）。
   * 返回该版本的 SchemaDetail，调用方负责将其写入 WidgetStore。
   */
  async function rollbackToVersion(version: string): Promise<SchemaDetail | null> {
    if (!editId.value) return null

    const result = await withLoading(() =>
      apiFetchVersion(editId.value, version),
    )

    if (result) {
      currentVersion.value = version
    }

    return result
  }

  // ================================================================
  // 版本删除
  // ================================================================

  /**
   * 删除指定版本。
   */
  async function removeVersion(version: string): Promise<boolean> {
    if (!editId.value) return false

    loading.value = true
    clearError()
    try {
      await apiDeleteVersion(editId.value, version)

      // 从列表中移除
      versions.value = versions.value.filter((v) => v.version !== version)
      total.value = Math.max(0, total.value - 1)

      // 如果删的是对比中的版本，清除对比状态
      if (compareLeft.value === version) compareLeft.value = ''
      if (compareRight.value === version) compareRight.value = ''

      loading.value = false
      return true
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('An unexpected error occurred')
      }
      return false
    }
  }

  // ================================================================
  // 版本导出
  // ================================================================

  /**
   * 导出指定版本的 Schema JSON。
   * 返回 JSON 字符串，调用方负责下载。
   */
  async function exportVersion(version: string): Promise<string | null> {
    if (!editId.value) return null

    try {
      const detail = await apiFetchVersion(editId.value, version)
      return JSON.stringify(detail.json, null, 2)
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      }
      return null
    }
  }

  // ================================================================
  // 重置
  // ================================================================

  function reset(): void {
    versions.value = []
    currentVersion.value = ''
    editId.value = ''
    page.value = 1
    total.value = 0
    compareLeft.value = ''
    compareRight.value = ''
    leftDetail.value = null
    rightDetail.value = null
    diffResult.value = null
    compareLoading.value = false
    loading.value = false
    error.value = ''
  }

  return {
    // 状态
    versions,
    currentVersion,
    editId,
    loading,
    error,
    page,
    pageSize,
    total,
    compareLeft,
    compareRight,
    leftDetail,
    rightDetail,
    diffResult,
    compareLoading,
    // 计算属性
    hasVersions,
    isEmpty,
    hasError,
    canCompare,
    diffSummary,
    hasDiff,
    // 操作
    init,
    loadVersions,
    goToPage,
    selectForCompare,
    clearCompare,
    executeCompare,
    rollbackToVersion,
    removeVersion,
    exportVersion,
    reset,
    clearError,
  }
})
