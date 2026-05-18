/**
 * usePropertyStore — 属性面板状态管理
 *
 * 管理右侧属性面板的 UI 状态：当前展开段落、实时校验结果、
 * 以及属性编辑的脏追踪。
 *
 * 设计原则：
 * - 属性面板通过 useEditorStore 派生选中项信息，避免重复存储
 * - 校验在 schema 更新时实时计算（computed）
 * - activeSection 用于控制折叠面板展开/折叠
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { validateSchema } from '@/utils/schemaValidate'
import type { ValidationResult } from '@/utils/schemaValidate'
import { useEditorStore } from './editor'

/** 属性面板支持的分段名称 */
export type PropertySectionName =
  | 'basic'
  | 'listApi'
  | 'searchFields'
  | 'columns'
  | 'rowActions'
  | 'buttons'
  | 'dialog'
  | 'rules'
  | 'linkage'
  | 'api'
  | 'json'

/** 支持 API 配置的组件类型 */
const API_SUPPORTED_TYPES = [
  'select',
  'radio',
  'checkbox',
  'person-select',
  'dept-select',
  'transfer',
  'tree-layout',
]

/** 布局类型（不显示 field/label 编辑等） */
const LAYOUT_TYPES = [
  'grid-row',
  'grid-col',
  'page',
  'toolbar',
  'card',
  'title',
  'divider',
  'spacer',
  'steps',
  'tabs',
  'dialog',
]

/** 按钮类型 */
const BUTTON_TYPES = ['button-list', 'toolbar-buttons']

export const usePropertyStore = defineStore('property', () => {
  const editorStore = useEditorStore()

  // ================================================================
  // UI 状态
  // ================================================================

  /** 当前展开的属性编辑段落 */
  const activeSection = ref<PropertySectionName>('basic')

  /** 已修改但未提交的字段集合（脏追踪） */
  const dirtyFields = ref<Set<string>>(new Set())

  // ================================================================
  // 计算属性：从 editorStore 派生
  // ================================================================

  /** 当前正在编辑的 schema 节点 */
  const currentSchema = computed(() => editorStore.selectedSchema)

  /** 是否为布局类型 */
  const isLayoutType = computed(() => {
    const t = currentSchema.value?.type
    return t ? LAYOUT_TYPES.includes(t) : false
  })

  /** 是否为按钮类型 */
  const isButtonType = computed(() => {
    const t = currentSchema.value?.type
    return t ? BUTTON_TYPES.includes(t) : false
  })

  /** 是否为 search-list 类型 */
  const isSearchListType = computed(() => {
    return currentSchema.value?.type === 'search-list'
  })

  /** 是否为 dialog 类型 */
  const isDialogType = computed(() => {
    return currentSchema.value?.type === 'dialog'
  })

  /** 是否支持 span 属性 */
  const supportsSpan = computed(() => {
    return currentSchema.value?.type === 'grid-col'
  })

  /** 是否支持 API 配置（动态选项） */
  const supportsApi = computed(() => {
    const t = currentSchema.value?.type
    return t ? API_SUPPORTED_TYPES.includes(t) : false
  })

  /** 是否有选中节点 */
  const hasSelection = computed(() => currentSchema.value !== null)

  // ================================================================
  // 校验
  // ================================================================

  /**
   * 对当前编辑的 schema 节点执行实时校验。
   * 仅校验当前节点，非全量树校验。
   */
  const validationResult = computed<ValidationResult | null>(() => {
    if (!currentSchema.value) return null
    return validateSchema([currentSchema.value])
  })

  /** 校验错误数量 */
  const errorCount = computed(() => {
    return validationResult.value?.errors.filter((e) => e.severity === 'error').length ?? 0
  })

  /** 校验警告数量 */
  const warningCount = computed(() => {
    return validationResult.value?.errors.filter((e) => e.severity === 'warning').length ?? 0
  })

  /** 校验是否通过（无 error 级别问题） */
  const isValid = computed(() => {
    return validationResult.value?.valid ?? true
  })

  // ================================================================
  // 全量 schema 中收集的可用字段列表（供 linkage 配置使用）
  // ================================================================

  /** 排除当前编辑节点自身的所有字段名 */
  const availableFields = computed(() => {
    const fields = collectFields(editorStore.schema)
    const selfField = currentSchema.value?.field
    return selfField ? fields.filter((f) => f !== selfField) : fields
  })

  // ================================================================
  // 操作
  // ================================================================

  /**
   * 设置当前展开的属性分段。
   */
  function setActiveSection(section: PropertySectionName): void {
    activeSection.value = section
  }

  /** 标记字段为已修改 */
  function markDirty(field: string): void {
    dirtyFields.value = new Set(dirtyFields.value).add(field)
  }

  /** 标记字段为干净（已保存） */
  function markClean(field: string): void {
    const next = new Set(dirtyFields.value)
    next.delete(field)
    dirtyFields.value = next
  }

  /** 清除所有脏标记 */
  function clearDirty(): void {
    dirtyFields.value = new Set()
  }

  /** 判断字段是否已修改 */
  function isDirty(field: string): boolean {
    return dirtyFields.value.has(field)
  }

  return {
    // UI 状态
    activeSection,
    dirtyFields,
    // 计算属性
    currentSchema,
    isLayoutType,
    isButtonType,
    isSearchListType,
    isDialogType,
    supportsSpan,
    supportsApi,
    hasSelection,
    validationResult,
    errorCount,
    warningCount,
    isValid,
    availableFields,
    // 操作
    setActiveSection,
    markDirty,
    markClean,
    clearDirty,
    isDirty,
  }
})

// ================================================================
// 内部辅助函数
// ================================================================

/**
 * 从 schema 树中递归收集所有 field 名称（去重）。
 */
function collectFields(items: import('@/components/FormGrid/types').FormSchemaItem[]): string[] {
  const result: string[] = []
  for (const item of items) {
    if (item.field) result.push(item.field)
    if (item.children?.length) result.push(...collectFields(item.children))
  }
  return [...new Set(result)]
}
