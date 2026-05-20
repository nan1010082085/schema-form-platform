/**
 * useCanvasStore — 画布编辑器状态管理（单一数据源）
 *
 * 职责：
 * - ComponentNode[] 画布数据的 CRUD
 * - 画布配置（尺寸、背景色、内边距）
 * - 选中状态（单选/多选，基于 ID）
 * - 撤销/重做历史（快照式）
 * - 剪贴板（复制/粘贴）
 * - 编辑器模式（edit/preview）
 * - 弹窗编辑器状态（哪个 dialog 正在被编辑）
 *
 * 这是编辑器画布数据的唯一 source of truth。
 * API store (useApiStore) 负责服务端 CRUD，不持有画布状态。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ComponentNode, CanvasConfig, Transform } from '@/components/FormGrid/types'
import { generateComponentId } from '@/composables/useIdGenerate'

export const useCanvasStore = defineStore('schemaCanvas', () => {
  // ================================================================
  // 画布数据
  // ================================================================

  const schema = ref<ComponentNode[]>([])
  const canvasConfig = ref<CanvasConfig>({
    width: 1920, height: 1080, backgroundColor: '#ffffff', padding: '0px',
  })
  const mode = ref<'edit' | 'preview' | 'publish-interactive' | 'publish-readonly'>('edit')

  // ================================================================
  // 选中状态
  // ================================================================

  const selectedId = ref<string | null>(null)
  const selectedIds = ref<string[]>([])

  // ================================================================
  // 弹窗编辑器状态
  // ================================================================

  /** 正在编辑弹窗内容的 dialog 组件 ID（null = 无） */
  const editingDialogComponentId = ref<string | null>(null)

  // ================================================================
  // 历史记录（撤销/重做）
  // ================================================================

  const history = ref<ComponentNode[][]>([])
  const historyIndex = ref(-1)
  const MAX_HISTORY = 30

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  // ================================================================
  // 内部工具
  // ================================================================

  function pushHistory() {
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(JSON.parse(JSON.stringify(schema.value)))
    if (history.value.length > MAX_HISTORY) history.value.shift()
    historyIndex.value = history.value.length - 1
  }

  function findNode(id: string, nodes: ComponentNode[] = schema.value): ComponentNode | null {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children) {
        const found = findNode(id, node.children)
        if (found) return found
      }
    }
    return null
  }

  function removeNodeById(id: string, nodes: ComponentNode[]): boolean {
    const idx = nodes.findIndex(n => n.id === id)
    if (idx >= 0) { nodes.splice(idx, 1); return true }
    for (const node of nodes) {
      if (node.children && removeNodeById(id, node.children)) return true
    }
    return false
  }

  function getMaxZIndex(nodes: ComponentNode[] = schema.value): number {
    let max = 0
    for (const node of nodes) {
      if (node.zIndex > max) max = node.zIndex
      if (node.children) {
        const childMax = getMaxZIndex(node.children)
        if (childMax > max) max = childMax
      }
    }
    return max
  }

  // ================================================================
  // 撤销/重做
  // ================================================================

  function undo() {
    if (historyIndex.value <= 0) return
    historyIndex.value--
    schema.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
  }

  function redo() {
    if (historyIndex.value >= history.value.length - 1) return
    historyIndex.value++
    schema.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
  }

  // ================================================================
  // 选择操作
  // ================================================================

  function select(id: string | null) {
    selectedId.value = id
    selectedIds.value = id ? [id] : []
  }

  function toggleSelect(id: string) {
    const idx = selectedIds.value.indexOf(id)
    if (idx >= 0) {
      selectedIds.value.splice(idx, 1)
      selectedId.value = selectedIds.value[selectedIds.value.length - 1] ?? null
    } else {
      selectedIds.value.push(id)
      selectedId.value = id
    }
  }

  function clearSelection() {
    selectedId.value = null
    selectedIds.value = []
  }

  // ================================================================
  // 节点 CRUD
  // ================================================================

  function addNode(parentId: string | null, node: ComponentNode) {
    pushHistory()
    node.zIndex = getMaxZIndex() + 1
    if (!parentId) {
      schema.value.push(node)
    } else {
      const parent = findNode(parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(node)
      }
    }
    selectedId.value = node.id
    selectedIds.value = [node.id]
  }

  function removeNode(id: string) {
    pushHistory()
    removeNodeById(id, schema.value)
    if (selectedId.value === id) selectedId.value = null
    selectedIds.value = selectedIds.value.filter(sid => sid !== id)
  }

  function updateNode(id: string, patch: Partial<ComponentNode>) {
    pushHistory()
    const node = findNode(id)
    if (node) Object.assign(node, patch)
  }

  function moveNode(id: string, transform: Transform) {
    const node = findNode(id)
    if (node) node.transform = transform
  }

  function resizeNode(id: string, w: number, h: number) {
    const node = findNode(id)
    if (node) {
      node.transform.w = Math.max(20, w)
      node.transform.h = Math.max(20, h)
    }
  }

  function setZIndex(id: string, zIndex: number) {
    const node = findNode(id)
    if (node) node.zIndex = Math.max(1, zIndex)
  }

  // ================================================================
  // 剪贴板
  // ================================================================

  const clipboard = ref<ComponentNode | null>(null)

  function copyNode(id: string) {
    const node = findNode(id)
    if (node) clipboard.value = JSON.parse(JSON.stringify(node))
  }

  function pasteNode() {
    if (!clipboard.value) return
    const pasted: ComponentNode = JSON.parse(JSON.stringify(clipboard.value))
    pasted.id = generateComponentId(pasted.type)
    pasted.transform.x += 20
    pasted.transform.y += 20
    addNode(null, pasted)
  }

  // ================================================================
  // 画布配置
  // ================================================================

  function updateCanvasConfig(patch: Partial<CanvasConfig>) {
    Object.assign(canvasConfig.value, patch)
  }

  // ================================================================
  // 弹窗编辑器
  // ================================================================

  /** 打开指定 dialog 组件的编辑模式 */
  function openDialogEditor(componentId: string): void {
    editingDialogComponentId.value = componentId
  }

  /** 关闭 dialog 编辑模式 */
  function closeDialogEditor(): void {
    editingDialogComponentId.value = null
  }

  // ================================================================
  // 导出
  // ================================================================

  return {
    // 画布数据
    schema,
    canvasConfig,
    mode,
    // 选中状态
    selectedId,
    selectedIds,
    // 弹窗编辑器
    editingDialogComponentId,
    // 历史
    canUndo,
    canRedo,
    // 剪贴板
    clipboard,
    // 选择操作
    select,
    toggleSelect,
    clearSelection,
    // 节点 CRUD
    addNode,
    removeNode,
    updateNode,
    moveNode,
    resizeNode,
    setZIndex,
    // 剪贴板操作
    copyNode,
    pasteNode,
    // 撤销/重做
    undo,
    redo,
    pushHistory,
    // 画布配置
    updateCanvasConfig,
    // 节点查找
    findNode,
    // 弹窗编辑器
    openDialogEditor,
    closeDialogEditor,
  }
})
