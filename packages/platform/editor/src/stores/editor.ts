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
 *
 * 性能优化：统一深拷贝函数，集中管理快照序列化逻辑。
 */
import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import type { Widget } from '../widgets/base/types'
import { useWidgetStore } from './widget'

const MAX_HISTORY = 30

/**
 * 高效深拷贝 — 使用 JSON 序列化。
 * structuredClone 无法处理 Vue reactive proxy 对象（DataCloneError），
 * 因此始终使用 JSON 方式，这也是 undo/redo 快照的标准做法。
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

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

  const history = shallowRef<Widget[][]>([])
  const historyIndex = ref(-1)

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  // ================================================================
  // 弹窗编辑器（独立历史）
  // ================================================================

  const editingDialogId = ref<string | null>(null)
  const dialogHistory = shallowRef<Widget[][]>([])
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
  // 脏标记（未保存更改检测）
  // ================================================================

  const isDirty = ref(false)
  const savedHistoryIndex = ref(-1)

  function markDirty(): void {
    isDirty.value = true
  }

  function markClean(): void {
    isDirty.value = false
    savedHistoryIndex.value = historyIndex.value
  }

  // ================================================================
  // 配置弹窗触发（右键菜单 → PropertyPanel 打开弹框）
  // ================================================================

  type ConfigDialogType = 'events' | 'rules' | 'api' | 'variables'
  const configDialogTrigger = ref<{ widget: Widget; type: ConfigDialogType } | null>(null)

  function openConfigDialog(widget: Widget, type: ConfigDialogType) {
    configDialogTrigger.value = { widget, type }
  }

  function clearConfigDialogTrigger() {
    configDialogTrigger.value = null
  }

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
    const snapshot = deepClone(widgets)
    let newHistory = history.value.slice(0, historyIndex.value + 1)
    newHistory.push(snapshot)
    if (newHistory.length > MAX_HISTORY) {
      newHistory = newHistory.slice(1)
      if (savedHistoryIndex.value >= 0) {
        savedHistoryIndex.value = Math.max(0, savedHistoryIndex.value - 1)
      }
    }
    history.value = newHistory
    historyIndex.value = newHistory.length - 1
    markDirty()
  }

  /**
   * 撤销。返回快照数据，由调用方赋值给 widgetStore.widgets。
   * 无法撤销时返回 null。
   */
  function undo(): Widget[] | null {
    if (historyIndex.value <= 0) return null
    historyIndex.value--
    isDirty.value = historyIndex.value !== savedHistoryIndex.value
    return deepClone(history.value[historyIndex.value])
  }

  /**
   * 重做。返回快照数据，由调用方赋值给 widgetStore.widgets。
   * 无法重做时返回 null。
   */
  function redo(): Widget[] | null {
    if (historyIndex.value >= history.value.length - 1) return null
    historyIndex.value++
    isDirty.value = historyIndex.value !== savedHistoryIndex.value
    return deepClone(history.value[historyIndex.value])
  }

  // ================================================================
  // 剪贴板操作
  // ================================================================

  function copy(widget: Widget): void {
    clipboard.value = deepClone(widget)
  }

  /**
   * 粘贴。返回深拷贝的 Widget，调用方负责生成新 ID 和调整位置。
   * 剪贴板为空时返回 null。
   */
  function paste(): Widget | null {
    if (!clipboard.value) return null
    return deepClone(clipboard.value)
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
    const snapshot = deepClone(widgets)
    let newHistory = dialogHistory.value.slice(0, dialogHistoryIndex.value + 1)
    newHistory.push(snapshot)
    if (newHistory.length > MAX_HISTORY) {
      newHistory = newHistory.slice(1)
    }
    dialogHistory.value = newHistory
    dialogHistoryIndex.value = newHistory.length - 1
  }

  /**
   * 弹窗编辑器撤销。
   */
  function undoDialog(): Widget[] | null {
    if (dialogHistoryIndex.value <= 0) return null
    dialogHistoryIndex.value--
    return deepClone(dialogHistory.value[dialogHistoryIndex.value])
  }

  /**
   * 弹窗编辑器重做。
   */
  function redoDialog(): Widget[] | null {
    if (dialogHistoryIndex.value >= dialogHistory.value.length - 1) return null
    dialogHistoryIndex.value++
    return deepClone(dialogHistory.value[dialogHistoryIndex.value])
  }

  // ================================================================
  // 组合操作（消除 EditorView / EditorViewToolbar 重复代码）
  // ================================================================

  function performUndo(): void {
    const widgetStore = useWidgetStore()
    const snapshot = undo()
    if (snapshot) widgetStore.widgets = snapshot
  }

  function performRedo(): void {
    const widgetStore = useWidgetStore()
    const snapshot = redo()
    if (snapshot) widgetStore.widgets = snapshot
  }

  function performCopyWidget(): void {
    const widgetStore = useWidgetStore()
    const widget = widgetStore.findWidget(selectedId.value ?? '')
    if (widget) copy(widget)
  }

  function performDeleteWidget(): void {
    if (!selectedId.value) return
    const widgetStore = useWidgetStore()
    widgetStore.removeWidget(selectedId.value)
    clearSelection()
    pushHistory([...widgetStore.widgets])
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
    // 脏标记
    isDirty,
    markDirty,
    markClean,
    // 配置弹窗触发
    configDialogTrigger,
    openConfigDialog,
    clearConfigDialogTrigger,
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
    // 组合操作
    performUndo,
    performRedo,
    performCopyWidget,
    performDeleteWidget,
  }
})
