/**
 * usePreviewInteraction — 预览面板交互状态管理
 */
import { ref, computed } from 'vue'
import type { Widget, FlowNodeData } from '@/types'

export interface EditContext {
  type: 'field' | 'node'
  id: string
  data: Record<string, unknown>
}

export function usePreviewInteraction() {
  // ---- Field selection ----
  const selectedFieldId = ref<string | null>(null)
  const selectedFieldDetail = ref<Record<string, unknown> | null>(null)
  const isFieldDetailVisible = ref(false)

  function selectField(widget: Widget) {
    selectedFieldId.value = widget.id
    selectedFieldDetail.value = {
      id: widget.id,
      type: widget.type,
      label: widget.label,
      field: widget.field,
      props: widget.props ? { ...widget.props } : {},
    }
    isFieldDetailVisible.value = true
  }

  function closeFieldDetail() {
    isFieldDetailVisible.value = false
  }

  function clearFieldSelection() {
    selectedFieldId.value = null
    selectedFieldDetail.value = null
    isFieldDetailVisible.value = false
  }

  // ---- Inline field editing ----
  const inlineEditWidgetId = ref<string | null>(null)
  const inlineEditData = ref<Record<string, unknown> | null>(null)
  const isInInlineEditMode = computed(() => inlineEditWidgetId.value !== null)

  function startInlineEdit(widget: Widget) {
    inlineEditWidgetId.value = widget.id
    inlineEditData.value = {
      label: widget.label,
      field: widget.field,
      ...(widget.props ? { ...widget.props } : {}),
    }
  }

  function updateInlineEdit(key: string, value: unknown) {
    if (inlineEditData.value) {
      inlineEditData.value[key] = value
    }
  }

  function commitInlineEdit() {
    if (!inlineEditWidgetId.value || !inlineEditData.value) return null
    const patch = {
      widgetId: inlineEditWidgetId.value,
      changes: { ...inlineEditData.value },
    }
    cancelInlineEdit()
    return patch
  }

  function cancelInlineEdit() {
    inlineEditWidgetId.value = null
    inlineEditData.value = null
  }

  // ---- Node selection ----
  const selectedNodeId = ref<string | null>(null)
  const selectedNodeDetail = ref<{ id: string; data: FlowNodeData } | null>(null)

  function selectNode(id: string, data: FlowNodeData) {
    selectedNodeId.value = id
    selectedNodeDetail.value = { id, data }
  }

  function clearNodeSelection() {
    selectedNodeId.value = null
    selectedNodeDetail.value = null
  }

  // ---- Field highlighting ----
  const highlightedFieldIds = ref(new Set<string>())

  function setHighlightedFields(ids: string[]) {
    highlightedFieldIds.value = new Set(ids)
  }

  function addHighlightedField(id: string) {
    highlightedFieldIds.value.add(id)
  }

  function clearHighlights() {
    highlightedFieldIds.value = new Set()
  }

  const isFieldHighlighted = computed(() => {
    return (id: string) => highlightedFieldIds.value.has(id)
  })

  // ---- Edit dialog ----
  const isEditDialogVisible = ref(false)
  const editContext = ref<EditContext | null>(null)

  function openFieldEdit(widget: Widget) {
    editContext.value = {
      type: 'field',
      id: widget.id,
      data: {
        type: widget.type,
        label: widget.label,
        field: widget.field,
        ...(widget.props ? { ...widget.props } : {}),
      },
    }
    isEditDialogVisible.value = true
  }

  function openNodeEdit(id: string, data: FlowNodeData) {
    editContext.value = {
      type: 'node',
      id,
      data: { ...data },
    }
    isEditDialogVisible.value = true
  }

  function closeEditDialog() {
    isEditDialogVisible.value = false
    editContext.value = null
  }

  // ---- Widget selection (partial apply) ----
  const selectedWidgetIds = ref(new Set<string>())

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

  // ---- Node status ----
  const nodeStatusMap = ref(new Map<string, string>())

  function setNodeStatus(id: string, status: string) {
    nodeStatusMap.value.set(id, status)
  }

  function getNodeStatus(id: string) {
    return nodeStatusMap.value.get(id)
  }

  function getNodeStatusColor(status: string) {
    const map: Record<string, string> = {
      added: 'success',
      modified: 'warning',
      removed: 'danger',
      unchanged: 'secondary',
    }
    return map[status] || 'secondary'
  }

  // ---- Reset ----
  function reset() {
    clearFieldSelection()
    clearNodeSelection()
    clearHighlights()
    clearWidgetSelection()
    closeEditDialog()
    nodeStatusMap.value = new Set() as unknown as Map<string, string>
    nodeStatusMap.value = new Map()
    cancelInlineEdit()
  }

  return {
    // Field selection
    selectedFieldId,
    selectedFieldDetail,
    isFieldDetailVisible,
    selectField,
    closeFieldDetail,
    clearFieldSelection,
    // Inline editing
    inlineEditWidgetId,
    inlineEditData,
    isInInlineEditMode,
    startInlineEdit,
    updateInlineEdit,
    commitInlineEdit,
    cancelInlineEdit,
    // Node selection
    selectedNodeId,
    selectedNodeDetail,
    selectNode,
    clearNodeSelection,
    // Field highlighting
    highlightedFieldIds,
    setHighlightedFields,
    addHighlightedField,
    clearHighlights,
    isFieldHighlighted,
    // Edit dialog
    isEditDialogVisible,
    editContext,
    openFieldEdit,
    openNodeEdit,
    closeEditDialog,
    // Widget selection
    selectedWidgetIds,
    toggleWidgetSelection,
    selectAllWidgets,
    clearWidgetSelection,
    hasSelection,
    selectedCount,
    // Node status
    nodeStatusMap,
    setNodeStatus,
    getNodeStatus,
    getNodeStatusColor,
    // Reset
    reset,
  }
}
