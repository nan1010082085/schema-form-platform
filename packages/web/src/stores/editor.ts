/**
 * useEditorStore — 编辑器交互状态
 *
 * 职责：
 * - 选中状态（单选/多选）
 * - 编辑器模式（edit/preview）
 * - 撤销/重做历史（主画布 + 弹窗编辑器独立管理）
 * - 剪贴板
 * - 弹窗编辑器状态
 *
 * 不涉及 Widget 数据本身，数据由 useWidgetStore 管理。
 * undo/redo 返回快照，由调用方赋值给 widgetStore.widgets。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Widget } from '../widgets/base/types'

const MAX_HISTORY = 30

export const useEditorStore = defineStore('editor', () => {
  // ================================================================
  // 选中状态
  // ================================================================

  const selectedId = ref<string | null>(null)
  const selectedIds = ref<string[]>([])

  // ================================================================
  // 编辑器模式
  // ================================================================

  const mode = ref<'edit' | 'preview'>('edit')

  // ================================================================
  // 撤销/重做（主画布）
  // ================================================================

  const history = ref<Widget[][]>([])
  const historyIndex = ref(-1)

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  // ================================================================
  // 弹窗编辑器（独立历史）
  // ================================================================

  const editingDialogId = ref<string | null>(null)
  const dialogHistory = ref<Widget[][]>([])
  const dialogHistoryIndex = ref(-1)

  const canUndoDialog = computed(() => dialogHistoryIndex.value > 0)
  const canRedoDialog = computed(
    () => dialogHistoryIndex.value < dialogHistory.value.length - 1,
  )

  // ================================================================
  // 剪贴板
  // ================================================================

  const clipboard = ref<Widget | null>(null)

  // ================================================================
  // 选择操作
  // ================================================================

  function select(id: string | null): void {
    selectedId.value = id
    selectedIds.value = id ? [id] : []
  }

  function toggleSelect(id: string): void {
    const idx = selectedIds.value.indexOf(id)
    if (idx >= 0) {
      selectedIds.value.splice(idx, 1)
      selectedId.value = selectedIds.value[selectedIds.value.length - 1] ?? null
    } else {
      selectedIds.value.push(id)
      selectedId.value = id
    }
  }

  function clearSelection(): void {
    selectedId.value = null
    selectedIds.value = []
  }

  // ================================================================
  // 撤销/重做（主画布）
  // ================================================================

  /**
   * 推入历史快照。
   * 截断 redo 历史，超过 MAX_HISTORY 移除最旧快照。
   * 返回深拷贝的快照数组，由调用方决定是否赋值。
   */
  function pushHistory(widgets: Widget[]): void {
    const snapshot = JSON.parse(JSON.stringify(widgets))
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(snapshot)
    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
    }
    historyIndex.value = history.value.length - 1
  }

  /**
   * 撤销。返回快照数据，由调用方赋值给 widgetStore.widgets。
   * 无法撤销时返回 null。
   */
  function undo(): Widget[] | null {
    if (historyIndex.value <= 0) return null
    historyIndex.value--
    return JSON.parse(JSON.stringify(history.value[historyIndex.value]))
  }

  /**
   * 重做。返回快照数据，由调用方赋值给 widgetStore.widgets。
   * 无法重做时返回 null。
   */
  function redo(): Widget[] | null {
    if (historyIndex.value >= history.value.length - 1) return null
    historyIndex.value++
    return JSON.parse(JSON.stringify(history.value[historyIndex.value]))
  }

  // ================================================================
  // 剪贴板操作
  // ================================================================

  function copy(widget: Widget): void {
    clipboard.value = JSON.parse(JSON.stringify(widget))
  }

  /**
   * 粘贴。返回深拷贝的 Widget，调用方负责生成新 ID 和调整位置。
   * 剪贴板为空时返回 null。
   */
  function paste(): Widget | null {
    if (!clipboard.value) return null
    return JSON.parse(JSON.stringify(clipboard.value))
  }

  // ================================================================
  // 编辑器模式
  // ================================================================

  function setMode(newMode: 'edit' | 'preview'): void {
    mode.value = newMode
  }

  // ================================================================
  // 弹窗编辑器
  // ================================================================

  function openDialogEditor(id: string): void {
    editingDialogId.value = id
    dialogHistory.value = []
    dialogHistoryIndex.value = -1
  }

  function closeDialogEditor(): void {
    editingDialogId.value = null
    dialogHistory.value = []
    dialogHistoryIndex.value = -1
  }

  /**
   * 推入弹窗编辑器历史快照。
   */
  function pushDialogHistory(widgets: Widget[]): void {
    const snapshot = JSON.parse(JSON.stringify(widgets))
    dialogHistory.value = dialogHistory.value.slice(0, dialogHistoryIndex.value + 1)
    dialogHistory.value.push(snapshot)
    if (dialogHistory.value.length > MAX_HISTORY) {
      dialogHistory.value.shift()
    }
    dialogHistoryIndex.value = dialogHistory.value.length - 1
  }

  /**
   * 弹窗编辑器撤销。
   */
  function undoDialog(): Widget[] | null {
    if (dialogHistoryIndex.value <= 0) return null
    dialogHistoryIndex.value--
    return JSON.parse(
      JSON.stringify(dialogHistory.value[dialogHistoryIndex.value]),
    )
  }

  /**
   * 弹窗编辑器重做。
   */
  function redoDialog(): Widget[] | null {
    if (dialogHistoryIndex.value >= dialogHistory.value.length - 1) return null
    dialogHistoryIndex.value++
    return JSON.parse(
      JSON.stringify(dialogHistory.value[dialogHistoryIndex.value]),
    )
  }

  // ================================================================
  // 导出
  // ================================================================

  return {
    // 选中状态
    selectedId,
    selectedIds,
    // 编辑器模式
    mode,
    // 撤销/重做（主画布）
    history,
    historyIndex,
    canUndo,
    canRedo,
    // 弹窗编辑器
    editingDialogId,
    dialogHistory,
    dialogHistoryIndex,
    canUndoDialog,
    canRedoDialog,
    // 剪贴板
    clipboard,
    // 选择操作
    select,
    toggleSelect,
    clearSelection,
    // 撤销/重做
    pushHistory,
    undo,
    redo,
    // 剪贴板操作
    copy,
    paste,
    // 编辑器模式
    setMode,
    // 弹窗编辑器
    openDialogEditor,
    closeDialogEditor,
    pushDialogHistory,
    undoDialog,
    redoDialog,
  }
})
