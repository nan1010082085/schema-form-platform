/**
 * useEditorStore — 编辑器核心状态管理
 *
 * 管理画布上的 schema 树、选中状态、撤销/重做历史、剪贴板、
 * 以及拖拽生成对话框等编辑器全局状态。
 *
 * 设计原则：
 * - 所有 schema 变更操作自动记录历史（pushState 内置在 action 中）
 * - 基于路径（number[]）的选择系统，支持多选（Ctrl/Shift）
 * - 与 useHistory composable 保持相同的快照+指针式 undo/redo 策略
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FormSchemaItem, SchemaType } from '@/components/FormGrid/types'
import { createDefaultSchema } from '@/utils/schemaDefaults'
import {
  getItemAtPath,
  removeAtPath,
  insertAtPath,
  flattenToPaths,
  comparePaths,
  groupAsContainer,
  ungroupContainer,
  isContainerType,
} from '@/utils/schemaTransform'
import { validateSchema } from '@/utils/schemaValidate'

/** 撤销/重做历史最大深度 */
const MAX_HISTORY_SIZE = 50

export const useEditorStore = defineStore('editor', () => {
  // ================================================================
  // 核心状态
  // ================================================================

  /** 当前可编辑的完整 schema 树 */
  const schema = ref<FormSchemaItem[]>([])

  /** 编辑器模式：edit（画布编辑）| preview（预览渲染） */
  const mode = ref<'edit' | 'preview'>('edit')

  /** 主选中节点路径（null = 无选中） */
  const selectedPath = ref<number[] | null>(null)

  /** 多选路径集合（含主选中路径） */
  const selectedPaths = ref<number[][]>([])

  /** 剪贴板：存储已复制/剪切的单个 schema 节点 */
  const clipboard = ref<FormSchemaItem | null>(null)

  // ================================================================
  // 生成 Schema 对话框（API 响应 → schema 推断）
  // ================================================================

  /** 从 API 响应推断出的字段列表 */
  const generatedSchema = ref<FormSchemaItem[]>([])

  /** 是否显示生成 schema 的使用方式选择对话框 */
  const showGenerateDialog = ref(false)

  /** 正在编辑弹窗内容的 dialog 组件 ID（null = 无） */
  const editingDialogComponentId = ref<string | null>(null)

  // ================================================================
  // 撤销/重做历史
  // ================================================================

  /** 历史快照栈，每个元素是 schema 的深拷贝 */
  const historyStack = ref<FormSchemaItem[][]>([])

  /** 当前历史指针位置（-1 = 无历史） */
  const historyPointer = ref(-1)

  // ================================================================
  // 计算属性
  // ================================================================

  /** 主选中节点的顶层索引（向后兼容 PropertyPanel） */
  const selectedIndex = computed<number | null>(() => {
    return selectedPath.value?.[0] ?? null
  })

  /** 所有选中节点的顶层索引列表（工具栏批量操作） */
  const selectedIndices = computed<number[]>(() => {
    return selectedPaths.value.map((p) => p[0]).filter((v, i, a) => a.indexOf(v) === i)
  })

  /** 主选中节点对应的 FormSchemaItem */
  const selectedSchema = computed<FormSchemaItem | null>(() => {
    if (!selectedPath.value) return null
    return getItemAtPath(schema.value, selectedPath.value) ?? null
  })

  /** 是否可以撤销 */
  const canUndo = computed(() => historyPointer.value > 0)

  /** 是否可以重做 */
  const canRedo = computed(() => historyPointer.value < historyStack.value.length - 1)

  /** 可撤销次数 */
  const undoCount = computed(() => historyPointer.value)

  /** 可重做次数 */
  const redoCount = computed(() => {
    return historyStack.value.length === 0
      ? 0
      : historyStack.value.length - 1 - historyPointer.value
  })

  /** 画布是否为空 */
  const isEmpty = computed(() => schema.value.length === 0)

  // ================================================================
  // 内部工具
  // ================================================================

  /**
   * 深拷贝 schema 数组（JSON 序列化）
   */
  function deepClone(items: FormSchemaItem[]): FormSchemaItem[] {
    return JSON.parse(JSON.stringify(items)) as FormSchemaItem[]
  }

  /**
   * 记录当前 schema 到历史栈，供后续撤销。
   * 在每次 schema 变更前调用。
   */
  function pushState(): void {
    const snapshot = deepClone(schema.value)

    // 丢弃当前指针之后的所有重做状态
    if (historyPointer.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, historyPointer.value + 1)
    }

    // 跳过与当前快照的重复（避免空操作记录）
    if (historyStack.value.length > 0) {
      const last = historyStack.value[historyPointer.value]
      if (JSON.stringify(last) === JSON.stringify(snapshot)) {
        return
      }
    }

    historyStack.value.push(snapshot)
    historyPointer.value = historyStack.value.length - 1

    // 超出上限时从头部裁剪
    if (historyStack.value.length > MAX_HISTORY_SIZE) {
      const excess = historyStack.value.length - MAX_HISTORY_SIZE
      historyStack.value = historyStack.value.slice(excess)
      historyPointer.value -= excess
    }
  }

  /**
   * 替换指定路径的 schema 节点，返回新的 schema 数组。
   */
  function replaceAtPath(
    items: FormSchemaItem[],
    path: number[],
    newItem: FormSchemaItem,
  ): FormSchemaItem[] {
    if (path.length === 0) return items
    const result = deepClone(items)
    if (path.length === 1) {
      result[path[0]] = newItem
      return result
    }
    const parent = getItemAtPath(result, path.slice(0, -1))
    if (parent?.children) {
      parent.children[path[path.length - 1]] = newItem
    }
    return result
  }

  /**
   * 调整目标路径：从 sourcePath 移除节点后，若两者共享父级且 source 在 target 之前，
   * 目标索引需要递减。
   */
  function adjustTargetAfterRemoval(
    sourcePath: number[],
    targetPath: number[],
  ): number[] {
    const minLen = Math.min(sourcePath.length, targetPath.length)
    for (let level = 0; level < minLen; level++) {
      if (sourcePath[level] !== targetPath[level]) {
        if (level === sourcePath.length - 1 && level === targetPath.length - 1) {
          if (sourcePath[level] < targetPath[level]) {
            const adjusted = [...targetPath]
            adjusted[level]--
            return adjusted
          }
        }
        return targetPath
      }
    }
    return targetPath
  }

  /**
   * 将顶层索引转换为路径。
   */
  function flatIndexToPath(index: number): number[] {
    return [index]
  }

  // ================================================================
  // 选择操作
  // ================================================================

  /**
   * 选中一个节点。
   *
   * @param index   - 顶层索引，null 表示取消选中
   * @param ctrlKey - 是否按住 Ctrl/Cmd 键（toggle 模式）
   * @param shiftKey - 是否按住 Shift 键（范围选择模式，仅顶层）
   */
  function selectNode(index: number | null, ctrlKey = false, shiftKey = false): void {
    if (index === null) {
      clearSelection()
      return
    }

    const clickedPath = flatIndexToPath(index)

    if (shiftKey && selectedPath.value && selectedPath.value.length === 1) {
      // Shift+Click: 范围选择（顶层）
      const fromIdx = selectedPath.value[0]
      const toIdx = index
      const minIdx = Math.min(fromIdx, toIdx)
      const maxIdx = Math.max(fromIdx, toIdx)

      const topLevelPaths = flattenToPaths(schema.value).filter((p) => p.length === 1)
      const rangePaths = topLevelPaths.filter(
        (p) => p[0] >= minIdx && p[0] <= maxIdx,
      )
      selectedPaths.value = rangePaths
      selectedPath.value = clickedPath
    } else if (ctrlKey) {
      // Ctrl+Click: toggle 选择
      const key = clickedPath.join(',')
      const existingIdx = selectedPaths.value.findIndex(
        (p) => p.join(',') === key,
      )
      if (existingIdx >= 0) {
        selectedPaths.value = selectedPaths.value.filter(
          (_, i) => i !== existingIdx,
        )
        if (selectedPath.value?.join(',') === key) {
          selectedPath.value =
            selectedPaths.value.length > 0
              ? selectedPaths.value[selectedPaths.value.length - 1]
              : null
        }
      } else {
        selectedPaths.value = [...selectedPaths.value, clickedPath]
        selectedPath.value = clickedPath
      }
    } else {
      // 普通点击：单选
      selectedPath.value = clickedPath
      selectedPaths.value = [clickedPath]
    }
  }

  /**
   * 选中指定路径的节点（一般由结构树面板触发）。
   */
  function selectPath(path: number[]): void {
    selectedPath.value = path
    selectedPaths.value = [path]
  }

  /** 清除所有选中状态 */
  function clearSelection(): void {
    selectedPath.value = null
    selectedPaths.value = []
  }

  // ================================================================
  // Schema 变更操作（均自动记录历史）
  // ================================================================

  /**
   * 添加新节点。
   *
   * @param type       - 组件类型
   * @param parentPath - 父容器路径（空数组 = 顶层）
   * @param index      - 插入位置索引
   */
  function addNode(type: SchemaType, parentPath: number[] = [], index?: number): void {
    pushState()
    const item = createDefaultSchema(type)
    const insertIdx = index ?? getItemsAtPathLength(schema.value, parentPath)
    schema.value = insertAtPath(schema.value, parentPath, insertIdx, item)

    const newPath = [...parentPath, insertIdx]
    selectedPath.value = newPath
    selectedPaths.value = [newPath]
  }

  /**
   * 添加已有的 FormSchemaItem 节点（从面板拖入或粘贴）。
   */
  function addNodeItem(
    item: FormSchemaItem,
    parentPath: number[] = [],
    index?: number,
  ): void {
    pushState()
    const cloned = deepClone([item])[0]
    const insertIdx = index ?? getItemsAtPathLength(schema.value, parentPath)
    schema.value = insertAtPath(schema.value, parentPath, insertIdx, cloned)

    const newPath = [...parentPath, insertIdx]
    selectedPath.value = newPath
    selectedPaths.value = [newPath]
  }

  /**
   * 更新指定路径的 schema 节点。
   */
  function updateNode(path: number[], updatedItem: FormSchemaItem): void {
    pushState()
    schema.value = replaceAtPath(schema.value, path, updatedItem)
  }

  /**
   * 更新当前选中节点。
   * 若未选中则无操作。
   */
  function updateSelectedNode(updatedItem: FormSchemaItem): void {
    if (!selectedPath.value) return
    updateNode(selectedPath.value, updatedItem)
  }

  /**
   * 删除指定路径的节点。
   *
   * @param path - 要删除的节点路径
   * @returns 是否成功删除
   */
  function removeNode(path: number[]): boolean {
    if (path.length === 0) return false
    pushState()
    schema.value = removeAtPath(schema.value, path)

    // 清除可能失效的选中
    if (selectedPath.value && pathsEqual(selectedPath.value, path)) {
      clearSelection()
    }
    return true
  }

  /**
   * 删除全部选中的节点（按逆向排序以避免索引偏移）。
   */
  function removeAllSelected(): void {
    if (selectedPaths.value.length === 0) return
    pushState()

    // 深度优先逆向排序，确保从后往前删除
    const sorted = [...selectedPaths.value]
      .sort(comparePaths)
      .reverse()

    for (const path of sorted) {
      schema.value = removeAtPath(schema.value, path)
    }

    clearSelection()
  }

  /**
   * 移动节点（跨层级或同层重排）。
   *
   * @param sourcePath - 源节点路径
   * @param targetPath - 目标容器的路径
   * @param targetIndex - 在目标容器中的插入位置
   */
  function moveNode(
    sourcePath: number[],
    targetPath: number[],
    targetIndex: number,
  ): void {
    // 防止移动到自身及其子节点
    const targetKey = targetPath.join(',')
    const sourceKey = sourcePath.join(',')
    if (targetKey.startsWith(sourceKey + ',') || targetKey === sourceKey) {
      return
    }

    const item = getItemAtPath(schema.value, sourcePath)
    if (!item) return

    pushState()
    const clonedItem = deepClone([item])[0]

    // 先移除，再插入
    schema.value = removeAtPath(schema.value, sourcePath)

    // 调整目标路径
    const adjustedTarget = adjustTargetAfterRemoval(sourcePath, targetPath)
    schema.value = insertAtPath(schema.value, adjustedTarget, targetIndex, clonedItem)

    const newPath = [...adjustedTarget, targetIndex]
    selectedPath.value = newPath
    selectedPaths.value = [newPath]
  }

  /**
   * 同层上移选中节点。
   */
  function moveUp(): void {
    if (!selectedPath.value || selectedPath.value.length !== 1) return
    const idx = selectedPath.value[0]
    if (idx === 0) return
    pushState()
    const arr = deepClone(schema.value)
    const temp = arr[idx - 1]
    arr[idx - 1] = arr[idx]
    arr[idx] = temp
    schema.value = arr
    selectedPath.value = [idx - 1]
    selectedPaths.value = [[idx - 1]]
  }

  /**
   * 同层下移选中节点。
   */
  function moveDown(): void {
    if (!selectedPath.value || selectedPath.value.length !== 1) return
    const idx = selectedPath.value[0]
    if (idx >= schema.value.length - 1) return
    pushState()
    const arr = deepClone(schema.value)
    const temp = arr[idx + 1]
    arr[idx + 1] = arr[idx]
    arr[idx] = temp
    schema.value = arr
    selectedPath.value = [idx + 1]
    selectedPaths.value = [[idx + 1]]
  }

  /** 设置选中节点的对齐方式 */
  function align(alignment: 'left' | 'center' | 'right'): void {
    if (!selectedPath.value) return
    pushState()
    const item = getItemAtPath(schema.value, selectedPath.value)
    if (!item) return
    const updated: FormSchemaItem = { ...item, align: alignment }
    schema.value = replaceAtPath(schema.value, selectedPath.value, updated)
  }

  // ================================================================
  // 撤销/重做
  // ================================================================

  /**
   * 撤销到上一个历史状态。
   * @returns 是否成功
   */
  function undo(): boolean {
    if (!canUndo.value) return false
    historyPointer.value--
    schema.value = deepClone(historyStack.value[historyPointer.value])

    // 若选中节点超出范围则清除
    if (selectedPath.value && selectedPath.value[0] >= schema.value.length) {
      clearSelection()
    }
    return true
  }

  /**
   * 重做到下一个历史状态。
   * @returns 是否成功
   */
  function redo(): boolean {
    if (!canRedo.value) return false
    historyPointer.value++
    schema.value = deepClone(historyStack.value[historyPointer.value])

    if (selectedPath.value && selectedPath.value[0] >= schema.value.length) {
      clearSelection()
    }
    return true
  }

  /** 清空所有历史（通常在导入/重置 schema 后调用） */
  function clearHistory(): void {
    historyStack.value = []
    historyPointer.value = -1
  }

  // ================================================================
  // 剪贴板操作
  // ================================================================

  /**
   * 复制当前选中节点到剪贴板。
   * @returns 是否成功
   */
  function copy(): boolean {
    if (!selectedPath.value) return false
    const item = getItemAtPath(schema.value, selectedPath.value)
    if (!item) return false
    clipboard.value = deepClone([item])[0]
    return true
  }

  /**
   * 粘贴剪贴板中的节点到选中节点之后（同层）。
   * @returns 是否成功
   */
  function paste(): boolean {
    if (!clipboard.value) return false
    if (!selectedPath.value) {
      // 无选中：粘贴到顶层末尾
      pushState()
      const cloned = deepClone([clipboard.value])[0]
      schema.value = [...schema.value, cloned]
      const newPath = [schema.value.length - 1]
      selectedPath.value = newPath
      selectedPaths.value = [newPath]
      return true
    }

    pushState()
    const cloned = deepClone([clipboard.value])[0]
    const parentPath = selectedPath.value.slice(0, -1)
    const insertIdx = selectedPath.value[selectedPath.value.length - 1] + 1
    schema.value = insertAtPath(schema.value, parentPath, insertIdx, cloned)

    const newPath = [...parentPath, insertIdx]
    selectedPath.value = newPath
    selectedPaths.value = [newPath]
    return true
  }

  // ================================================================
  // 分组/取消分组
  // ================================================================

  /**
   * 将选中的顶层节点包装为容器。
   *
   * @param containerType - 容器类型：'card' | 'page' | 'toolbar'
   */
  function group(containerType: 'card' | 'page' | 'toolbar'): void {
    if (selectedIndices.value.length === 0) return
    pushState()
    schema.value = groupAsContainer(
      schema.value,
      selectedIndices.value,
      containerType,
    )
    // 选中新创建的容器
    const minIdx = Math.min(...selectedIndices.value)
    selectedPath.value = [minIdx]
    selectedPaths.value = [[minIdx]]
  }

  /** 取消分组：将容器替换为其子节点 */
  function ungroup(): boolean {
    if (!selectedPath.value) return false
    const item = getItemAtPath(schema.value, selectedPath.value)
    if (!item || !isContainerType(item)) return false
    if (selectedPath.value.length > 1) return false // 仅支持顶层解组
    pushState()
    const idx = selectedPath.value[0]
    schema.value = ungroupContainer(schema.value, idx)
    if (idx >= schema.value.length) {
      selectedPath.value =
        schema.value.length > 0 ? [schema.value.length - 1] : null
    } else {
      selectedPath.value = [idx]
    }
    selectedPaths.value = selectedPath.value ? [selectedPath.value] : []
    return true
  }

  // ================================================================
  // 导入/导出/重置
  // ================================================================

  /**
   * 导入一组 schema（替换或追加）。
   */
  function importSchema(
    newSchema: FormSchemaItem[],
    mode: 'replace' | 'append' = 'replace',
  ): void {
    pushState()
    if (mode === 'replace') {
      schema.value = deepClone(newSchema)
    } else {
      schema.value = [...schema.value, ...deepClone(newSchema)]
    }
    clearSelection()
  }

  /** 切换编辑/预览模式 */
  function setMode(newMode: 'edit' | 'preview'): void {
    mode.value = newMode
  }

  /** 重置编辑器到初始空白状态 */
  function reset(): void {
    schema.value = []
    selectedPath.value = null
    selectedPaths.value = []
    clipboard.value = null
    mode.value = 'edit'
    generatedSchema.value = []
    showGenerateDialog.value = false
    clearHistory()
  }

  // ================================================================
  // 生成 Schema 对话框（API → schema）
  // ================================================================

  /** 设置从 API 响应推断的 schema */
  function setGeneratedSchema(items: FormSchemaItem[]): void {
    generatedSchema.value = items
    showGenerateDialog.value = true
  }

  /** 关闭生成 dialog */
  function closeGenerateDialog(): void {
    showGenerateDialog.value = false
  }

  /** 将生成的字段作为表单字段（包装在 grid-row > grid-col 中）添加到画布 */
  function useGeneratedAsFormFields(): void {
    if (generatedSchema.value.length === 0) return
    pushState()
    const gridCols: FormSchemaItem[] = generatedSchema.value.map((item) => ({
      type: 'grid-col' as const,
      span: Math.max(1, Math.floor(24 / generatedSchema.value.length)),
      children: [deepClone([item])[0]],
    } satisfies FormSchemaItem))
    const gridRow: FormSchemaItem = {
      type: 'grid-row',
      children: gridCols,
    }
    schema.value = [...schema.value, gridRow]
    showGenerateDialog.value = false
    const newPath = [schema.value.length - 1]
    selectedPath.value = newPath
    selectedPaths.value = [newPath]
  }

  /** 打开指定 dialog 组件的编辑模式 */
  function openDialogEditor(componentId: string): void {
    editingDialogComponentId.value = componentId
  }

  /** 关闭 dialog 编辑模式 */
  function closeDialogEditor(): void {
    editingDialogComponentId.value = null
  }

  /** 将生成的字段作为表格列应用到当前选中的 search-list/table 节点 */
  function useGeneratedAsColumns(): void {
    if (!selectedPath.value || generatedSchema.value.length === 0) return
    pushState()
    const columns = generatedSchema.value.map((item) => ({
      prop: item.field ?? '',
      label: item.label ?? item.field ?? '',
    }))
    const currentItem = getItemAtPath(schema.value, selectedPath.value)
    if (currentItem) {
      const updated: FormSchemaItem = { ...currentItem, columns }
      schema.value = replaceAtPath(schema.value, selectedPath.value, updated)
    }
    showGenerateDialog.value = false
  }

  // ================================================================
  // 校验
  // ================================================================

  /**
   * 对整个 schema 树执行全量结构校验。
   */
  function validateAll(): ReturnType<typeof validateSchema> {
    return validateSchema(schema.value)
  }

  // ================================================================
  // 导出
  // ================================================================

  return {
    // 状态
    schema,
    mode,
    selectedPath,
    selectedPaths,
    clipboard,
    generatedSchema,
    showGenerateDialog,
    editingDialogComponentId,
    historyStack,
    historyPointer,
    // 计算属性
    selectedIndex,
    selectedIndices,
    selectedSchema,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    isEmpty,
    // 选择操作
    selectNode,
    selectPath,
    clearSelection,
    // Schema 变更
    addNode,
    addNodeItem,
    updateNode,
    updateSelectedNode,
    removeNode,
    removeAllSelected,
    moveNode,
    moveUp,
    moveDown,
    align,
    // 撤销/重做
    pushState,
    undo,
    redo,
    clearHistory,
    // 剪贴板
    copy,
    paste,
    // 分组
    group,
    ungroup,
    // 导入/导出/重置
    importSchema,
    setMode,
    reset,
    // 生成 schema
    setGeneratedSchema,
    closeGenerateDialog,
    openDialogEditor,
    closeDialogEditor,
    useGeneratedAsFormFields,
    useGeneratedAsColumns,
    // 校验
    validateAll,
  }
})

// ================================================================
// 内部辅助函数
// ================================================================

/** 判断两个路径是否相等 */
function pathsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

/** 获取指定路径节点的 children 长度（用于确定追加位置） */
function getItemsAtPathLength(
  items: FormSchemaItem[],
  path: number[],
): number {
  if (path.length === 0) return items.length
  const parent = getItemAtPath(items, path)
  return parent?.children?.length ?? 0
}
