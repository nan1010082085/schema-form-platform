/**
 * 预览面板交互逻辑
 *
 * 管理字段选中、高亮、编辑状态，支持部分应用。
 */

import { ref, computed, shallowRef } from 'vue'
import type { Widget, FlowNodeData } from '@/types'

/** 字段详情 */
export interface FieldDetail {
  id: string
  type: string
  label?: string
  field?: string
  props?: Record<string, unknown>
}

/** 节点详情 */
export interface NodeDetail {
  id: string
  data: FlowNodeData
}

/** 编辑上下文 */
export interface EditContext {
  type: 'field' | 'node'
  id: string
  data: Record<string, unknown>
}

export function usePreviewInteraction() {
  // ---- 选中状态 ----

  const selectedFieldId = ref<string | null>(null)
  const selectedNodeId = ref<string | null>(null)

  // ---- 高亮字段（AI 修改的字段） ----

  const highlightedFieldIds = ref<Set<string>>(new Set())

  function setHighlightedFields(ids: string[]) {
    highlightedFieldIds.value = new Set(ids)
  }

  function addHighlightedField(id: string) {
    highlightedFieldIds.value.add(id)
  }

  function clearHighlights() {
    highlightedFieldIds.value = new Set()
  }

  const isFieldHighlighted = computed(() => (id: string) =>
    highlightedFieldIds.value.has(id),
  )

  // ---- 字段详情 ----

  const selectedFieldDetail = shallowRef<FieldDetail | null>(null)

  function selectField(widget: Widget) {
    selectedFieldId.value = widget.id
    selectedFieldDetail.value = {
      id: widget.id,
      type: widget.type,
      label: widget.label,
      field: widget.field,
      props: widget.props,
    }
  }

  function clearFieldSelection() {
    selectedFieldId.value = null
    selectedFieldDetail.value = null
  }

  // ---- 节点详情 ----

  const selectedNodeDetail = shallowRef<NodeDetail | null>(null)

  function selectNode(id: string, data: FlowNodeData) {
    selectedNodeId.value = id
    selectedNodeDetail.value = { id, data }
  }

  function clearNodeSelection() {
    selectedNodeId.value = null
    selectedNodeDetail.value = null
  }

  // ---- 编辑弹窗 ----

  const editContext = shallowRef<EditContext | null>(null)
  const isEditDialogVisible = ref(false)

  function openFieldEdit(widget: Widget) {
    editContext.value = {
      type: 'field',
      id: widget.id,
      data: {
        type: widget.type,
        label: widget.label,
        field: widget.field,
        ...widget.props,
      },
    }
    isEditDialogVisible.value = true
  }

  function openNodeEdit(id: string, data: FlowNodeData) {
    editContext.value = {
      type: 'node',
      id,
      data: data as Record<string, unknown>,
    }
    isEditDialogVisible.value = true
  }

  function closeEditDialog() {
    isEditDialogVisible.value = false
    editContext.value = null
  }

  // ---- 部分应用 ----

  const selectedWidgetIds = ref<Set<string>>(new Set())

  function toggleWidgetSelection(id: string) {
    if (selectedWidgetIds.value.has(id)) {
      selectedWidgetIds.value.delete(id)
    } else {
      selectedWidgetIds.value.add(id)
    }
  }

  function selectAllWidgets(widgets: Widget[]) {
    selectedWidgetIds.value = new Set(widgets.map((w) => w.id))
  }

  function clearWidgetSelection() {
    selectedWidgetIds.value = new Set()
  }

  const hasSelection = computed(() => selectedWidgetIds.value.size > 0)

  const selectedCount = computed(() => selectedWidgetIds.value.size)

  // ---- 节点状态颜色 ----

  const nodeStatusMap = ref<Map<string, string>>(new Map())

  function setNodeStatus(nodeId: string, status: string) {
    nodeStatusMap.value.set(nodeId, status)
  }

  function getNodeStatus(nodeId: string): string | undefined {
    return nodeStatusMap.value.get(nodeId)
  }

  function getNodeStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      added: 'var(--ai-color-success, #26A036)',
      modified: 'var(--ai-color-warning, #E6A23C)',
      removed: 'var(--ai-color-danger, #E50113)',
      unchanged: 'var(--ai-text-secondary, #666666)',
    }
    return colorMap[status] ?? colorMap.unchanged
  }

  // ---- 重置 ----

  function reset() {
    clearFieldSelection()
    clearNodeSelection()
    clearHighlights()
    clearWidgetSelection()
    closeEditDialog()
    nodeStatusMap.value = new Map()
  }

  return {
    // 选中状态
    selectedFieldId,
    selectedNodeId,
    selectedFieldDetail,
    selectedNodeDetail,

    // 高亮
    highlightedFieldIds,
    isFieldHighlighted,
    setHighlightedFields,
    addHighlightedField,
    clearHighlights,

    // 字段操作
    selectField,
    clearFieldSelection,

    // 节点操作
    selectNode,
    clearNodeSelection,

    // 编辑弹窗
    editContext,
    isEditDialogVisible,
    openFieldEdit,
    openNodeEdit,
    closeEditDialog,

    // 部分应用
    selectedWidgetIds,
    toggleWidgetSelection,
    selectAllWidgets,
    clearWidgetSelection,
    hasSelection,
    selectedCount,

    // 节点状态
    nodeStatusMap,
    setNodeStatus,
    getNodeStatus,
    getNodeStatusColor,

    // 重置
    reset,
  }
}
