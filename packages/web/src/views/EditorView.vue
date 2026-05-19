<script setup lang="ts">
/**
 * EditorView — 可视化 Schema 编辑器 (Canvas Store Migration)
 *
 * 三栏布局：顶部工具栏 / 左侧(组件面板/结构树) + 中间画布 + 右侧属性面板
 * 使用 canvas store (schemaCanvas) 作为编辑器状态的单一数据源
 * API store (schema) 仅用于服务端 CRUD 操作
 *
 * 架构说明：
 * - canvasStore.schema (ComponentNode[]) 是画布数据的 source of truth
 * - computedFormSchema 从 ComponentNode[] 实时计算 FormSchemaItem[]
 *   供 PropertyPanel / SchemaTree / EditorToolbar 等仍依赖 FormSchemaItem 的组件消费
 * - PropertyPanel 更新通过 mergeComponentNodeFromFormSchema 合并回 ComponentNode
 *   仅更新表单相关字段，保留画布特有属性 (transform, zIndex, style 等)
 */
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import EditorToolbar from '@/components/Editor/EditorToolbar.vue'
import ComponentPanel from '@/components/Editor/ComponentPanel.vue'
import EditorCanvas from '@/components/Editor/EditorCanvas.vue'
import PropertyPanel from '@/components/Editor/PropertyPanel.vue'
import SchemaTree from '@/components/Editor/SchemaTree.vue'
import type { FormSchemaItem, ComponentNode, Transform, SchemaType } from '@/components/FormGrid/types'
import { useSchemaStore as useCanvasStore } from '@/stores/schemaStore'
import { useSchemaStore as useApiStore } from '@/stores/schema'
import { createComponentNode } from '@/utils/schemaDefaults'
import { processSchema } from '@/utils/requestQueue'
import { validateSchema } from '@/utils/schemaValidate'
import {
  groupAsContainer,
  ungroupContainer,
  isContainerType,
  getItemAtPath,
} from '@/utils/schemaTransform'

const route = useRoute()
const router = useRouter()
const canvasStore = useCanvasStore()
const apiStore = useApiStore()

// =====================================================================
// Canvas store state (source of truth)
// =====================================================================

const canvasSchema = computed(() => canvasStore.schema)
const canvasConfig = computed(() => canvasStore.canvasConfig)
const selectedId = computed(() => canvasStore.selectedId)
const selectedIds = computed(() => canvasStore.selectedIds)
const canvasMode = computed(() => canvasStore.mode)

// Sync canvas size preset with store
const canvasSizePreset = ref('1920x1080')
const canvasSizeMap: Record<string, { w: number; h: number }> = {
  '1920x1080': { w: 1920, h: 1080 },
  '1440x900': { w: 1440, h: 900 },
  '1366x768': { w: 1366, h: 768 },
}

// =====================================================================
// Computed FormSchemaItem[] — bridge for components still using old type
// =====================================================================

const computedFormSchema = computed<FormSchemaItem[]>(() =>
  canvasSchema.value.map((n) => componentNodeToFormSchema(n)),
)

const selectedFormSchemaItem = computed<FormSchemaItem | null>(() => {
  if (!selectedId.value) return null
  const node = canvasStore.findNode(selectedId.value)
  return node ? componentNodeToFormSchema(node) : null
})

const selectedNodeIndex = computed<number | null>(() => {
  if (!selectedId.value) return null
  const idx = canvasSchema.value.findIndex((n) => n.id === selectedId.value)
  return idx >= 0 ? idx : null
})

/** Find the full index path of a ComponentNode by ID in the tree */
function findNodePath(nodes: ComponentNode[], targetId: string): number[] | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === targetId) return [i]
    if (nodes[i].children) {
      const childPath = findNodePath(nodes[i].children!, targetId)
      if (childPath) return [i, ...childPath]
    }
  }
  return null
}

/** Full path of selected node in the ComponentNode tree — for SchemaTree highlight */
const selectedPath = computed<number[] | null>(() => {
  if (!selectedId.value) return null
  return findNodePath(canvasSchema.value, selectedId.value)
})

const selectedZIndex = computed<number>(() => {
  if (!selectedId.value) return 1
  const node = canvasStore.findNode(selectedId.value)
  return node?.zIndex ?? 1
})

// =====================================================================
// Local UI state (not in canvas store)
// =====================================================================

const leftPanelVisible = ref(true)
const rightPanelVisible = ref(true)
const leftTab = ref<'components' | 'structure'>('components')
const drawerVisible = ref(true)

// Schema metadata (server identity — not canvas state)
const currentSchemaId = ref<string | null>(null)
const schemaName = ref('')
const schemaType = ref<'form' | 'search-list'>('form')
const schemaStatus = ref<'draft' | 'published'>('draft')
const lastSavedJson = ref('')
let lastSavedName = ''

// Guard flag: prevents circular sync when PropertyPanel triggers update
const isSyncingFromFormSchema = ref(false)

// =====================================================================
// Thumbnail
// =====================================================================

const showThumbnail = ref(true)
const thumbScale = 12
const thumbColorMap: Record<string, string> = {
  'page': '#e8f4fd', 'card': '#fff', 'toolbar': '#f5f7fa',
  'grid-row': '#fafbfc', 'grid-col': '#fafbfc',
  'title': '#e8f4fd', 'table': '#ecf5ff', 'search-list': '#ecf5ff',
  'input': '#fff', 'number': '#fff', 'select': '#fff',
}
const canvasWidth = computed(() => canvasConfig.value.width)
const canvasHeight = computed(() => canvasConfig.value.height)
const indicatorStyle = computed(() => ({
  width: `${Math.round(canvasWidth.value / thumbScale)}px`,
  height: `${Math.round(canvasHeight.value / thumbScale)}px`,
}))
function handleThumbnailClick(_e: MouseEvent) {
  // Scroll to corresponding position (simplified)
}

// =====================================================================
// Load schema from route query
// =====================================================================

onMounted(async () => {
  const id = route.query.id as string | undefined
  if (id) {
    const detail = await apiStore.fetchSchemaById(id)
    if (detail?.json) {
      currentSchemaId.value = detail.id
      schemaName.value = detail.name
      schemaType.value = detail.type
      lastSavedName = detail.name

      // Convert FormSchemaItem[] → ComponentNode[] and load into canvas store
      const nodes = (detail.json as FormSchemaItem[]).map((item) =>
        formSchemaToComponentNode(item),
      )
      canvasStore.schema = nodes
      canvasStore.pushHistory()

      lastSavedJson.value = JSON.stringify(computedFormSchema.value)

      // Check published status
      const published = await apiStore.fetchPublishedSchema(detail.id)
      schemaStatus.value = published ? 'published' : 'draft'
    }
  }
})

// =====================================================================
// Sync canvas history on schema changes
// =====================================================================

watch(canvasSchema, () => {
  canvasStore.pushHistory()
}, { deep: true })

// =====================================================================
// Mode management (replaces useModeControl)
// =====================================================================

watch(canvasMode, async (newMode) => {
  if (newMode !== 'edit' && canvasSchema.value.length > 0) {
    await processSchema(computedFormSchema.value)
  }
})

function handlePreview() {
  if (currentSchemaId.value) {
    window.open(`/preview?id=${currentSchemaId.value}`, '_blank')
  }
}

// =====================================================================
// Unsaved changes detection
// =====================================================================

const isDirty = computed(() => {
  return JSON.stringify(computedFormSchema.value) !== lastSavedJson.value ||
         schemaName.value !== lastSavedName
})

// =====================================================================
// beforeRouteLeave guard
// =====================================================================

onBeforeRouteLeave(async (_to, _from, next) => {
  if (!isDirty.value) { next(); return }

  try {
    await ElMessageBox.confirm(
      '有未保存的更改。是否保存后离开？',
      '未保存的更改',
      {
        distinguishCancelAndClose: true,
        confirmButtonText: '保存',
        cancelButtonText: '不保存',
        type: 'warning',
      },
    )
    await handleSaveDraft()
    next()
  } catch (action) {
    if (action === 'cancel') {
      next()
    } else {
      next(false)
    }
  }
})

// =====================================================================
// Group/Ungroup (uses FormSchemaItem utilities, then syncs to canvas)
// =====================================================================

const canGroup = computed(() => selectedIds.value.length > 0)
const canUngroup = computed(() => {
  if (!selectedId.value) return false
  const node = canvasStore.findNode(selectedId.value)
  if (!node) return false
  return isContainerType(node as unknown as FormSchemaItem)
})

// =====================================================================
// Validation
// =====================================================================

const validationErrorCount = ref(0)
const validationWarningCount = ref(0)

// =====================================================================
// Save / Publish
// =====================================================================

async function handleSaveDraft() {
  if (!schemaName.value.trim()) {
    try {
      const { value: name } = await ElMessageBox.prompt(
        '请输入实例名称', '保存', {
          confirmButtonText: '保存',
          inputValidator: (v) => v.trim() ? true : '名称不能为空',
        },
      )
      schemaName.value = name.trim()
    } catch { return }
  }

  const result = await apiStore.saveFromEditor(
    computedFormSchema.value,
    schemaName.value,
    currentSchemaId.value ?? undefined,
  )

  if (result) {
    lastSavedJson.value = JSON.stringify(computedFormSchema.value)
    lastSavedName = schemaName.value
    if (!currentSchemaId.value) {
      currentSchemaId.value = result.id
      schemaStatus.value = 'draft'
      router.replace({ path: '/editor', query: { id: result.id } })
      const detail = await apiStore.fetchSchemaById(result.id)
      if (detail?.json) {
        const nodes = (detail.json as FormSchemaItem[]).map((item) =>
          formSchemaToComponentNode(item),
        )
        canvasStore.schema = nodes
        lastSavedJson.value = JSON.stringify(computedFormSchema.value)
      }
    } else {
      schemaStatus.value = 'draft'
    }
    ElMessage.success('草稿已保存')
  } else {
    ElMessage.error(apiStore.error || '保存失败')
  }
}

async function handlePublish() {
  if (!currentSchemaId.value) {
    await handleSaveDraft()
    if (!currentSchemaId.value) return
  }
  if (isDirty.value) await handleSaveDraft()

  const result = await apiStore.publishSchema(currentSchemaId.value)
  if (result) {
    schemaStatus.value = 'published'
    lastSavedJson.value = JSON.stringify(computedFormSchema.value)
    ElMessage.success('已发布！')
  } else {
    ElMessage.error(apiStore.error || '发布失败')
  }
}

// =====================================================================
// Import / Export / Load
// =====================================================================

function handleImport(importedSchema: FormSchemaItem[]) {
  const nodes = importedSchema.map((item) => formSchemaToComponentNode(item))
  canvasStore.schema = nodes
}

function handleLoadSchema(loadedSchema: FormSchemaItem[]) {
  const nodes = loadedSchema.map((item) => formSchemaToComponentNode(item))
  canvasStore.schema = nodes
}

function handleExport() {
  const json = JSON.stringify(computedFormSchema.value, null, 2)
  navigator.clipboard.writeText(json).then(() => {
    ElMessage.success('Schema JSON 已复制到剪贴板')
  }).catch(() => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'schema.json'; a.click()
    URL.revokeObjectURL(url)
  })
}

// =====================================================================
// Canvas controls
// =====================================================================

function handleToggleThumbnail() {
  showThumbnail.value = !showThumbnail.value
}

function handleCanvasSizeChange(preset: string) {
  canvasSizePreset.value = preset
  const size = canvasSizeMap[preset]
  if (size) canvasStore.updateCanvasConfig({ width: size.w, height: size.h })
}

// =====================================================================
// Selection
// =====================================================================

function handleSelect(id: string | null) {
  canvasStore.select(id)
  if (id) {
    nextTick(() => { drawerVisible.value = true })
  } else {
    drawerVisible.value = false
  }
}

function handleTreeSelect(path: number[]) {
  const item = getItemAtPath(computedFormSchema.value, path)
  if (!item?.componentId) return
  // Find the ComponentNode by matching the generated ID
  const node = findNodeByFormSchemaId(item.componentId)
  if (node) {
    canvasStore.select(node.id)
    nextTick(() => { drawerVisible.value = true })
  }
}

/** Find a ComponentNode whose id matches the given formSchema componentId */
function findNodeByFormSchemaId(componentId: string): ComponentNode | null {
  function search(nodes: ComponentNode[]): ComponentNode | null {
    for (const node of nodes) {
      if (node.id === componentId) return node
      if (node.children) {
        const found = search(node.children)
        if (found) return found
      }
    }
    return null
  }
  return search(canvasSchema.value)
}

// =====================================================================
// Property panel update — merge FormSchemaItem changes back to ComponentNode
// =====================================================================

function handlePropertyUpdate(updatedItem: FormSchemaItem) {
  if (!selectedId.value) return
  isSyncingFromFormSchema.value = true
  try {
    const existingNode = canvasStore.findNode(selectedId.value)
    if (!existingNode) return
    const merged = mergeComponentNodeFromFormSchema(existingNode, updatedItem)
    canvasStore.updateNode(selectedId.value, merged)
  } finally {
    nextTick(() => { isSyncingFromFormSchema.value = false })
  }
}

// =====================================================================
// Toolbar operations
// =====================================================================

function handleSchemaUpdate(_newSchema: ComponentNode[]) {
  // Canvas emitted a full schema update (e.g. from internal reorder)
  // Already handled by canvas store internally
}

function handleCopy() {
  if (!selectedId.value) return
  canvasStore.copyNode(selectedId.value)
  canvasStore.pasteNode()
}

function handleDelete() {
  if (selectedIds.value.length === 0) return
  for (const id of [...selectedIds.value].reverse()) {
    canvasStore.removeNode(id)
  }
  drawerVisible.value = false
}

function handleMoveUp() {
  if (!selectedId.value) return
  const idx = canvasSchema.value.findIndex((n) => n.id === selectedId.value)
  if (idx <= 0) return
  const arr = [...canvasStore.schema]
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
  canvasStore.schema = arr
}

function handleMoveDown() {
  if (!selectedId.value) return
  const idx = canvasSchema.value.findIndex((n) => n.id === selectedId.value)
  if (idx < 0 || idx >= canvasSchema.value.length - 1) return
  const arr = [...canvasStore.schema]
  ;[arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]
  canvasStore.schema = arr
}

function handleZIndexUp() {
  if (!selectedId.value) return
  const node = canvasStore.findNode(selectedId.value)
  if (!node) return
  canvasStore.setZIndex(selectedId.value, node.zIndex + 1)
}

function handleZIndexDown() {
  if (!selectedId.value) return
  const node = canvasStore.findNode(selectedId.value)
  if (!node) return
  canvasStore.setZIndex(selectedId.value, Math.max(1, node.zIndex - 1))
}

function handleAlign(align: 'left' | 'center' | 'right') {
  if (!selectedId.value) return
  canvasStore.updateNode(selectedId.value, { props: { ...canvasStore.findNode(selectedId.value)?.props, align } })
}

function handleUndo() { canvasStore.undo() }
function handleRedo() { canvasStore.redo() }

function handleGroup(containerType: 'card' | 'page' | 'toolbar') {
  if (selectedIds.value.length === 0) return
  const indices = selectedIds.value
    .map((id) => canvasSchema.value.findIndex((n) => n.id === id))
    .filter((i) => i >= 0)
  if (indices.length === 0) return

  // Use FormSchemaItem group utility, then convert back
  const grouped = groupAsContainer(computedFormSchema.value, indices, containerType)
  const nodes = grouped.map((item) => formSchemaToComponentNode(item))
  canvasStore.schema = nodes

  // Select the newly created group (at the minimum index)
  const minIdx = Math.min(...indices)
  if (nodes[minIdx]) canvasStore.select(nodes[minIdx].id)
}

function handleUngroup() {
  if (!selectedId.value) return
  const idx = canvasSchema.value.findIndex((n) => n.id === selectedId.value)
  if (idx < 0) return
  const item = computedFormSchema.value[idx]
  if (!isContainerType(item)) return

  const ungrouped = ungroupContainer(computedFormSchema.value, idx)
  const nodes = ungrouped.map((i) => formSchemaToComponentNode(i))
  canvasStore.schema = nodes

  // Select the first ungrouped item
  if (nodes[idx]) canvasStore.select(nodes[idx].id)
}

function handleTreeReorder(payload: {
  sourcePath: number[]
  targetPath: number[]
  position: 'before' | 'after' | 'inside'
}) {
  const { sourcePath, targetPath, position } = payload

  // Resolve source node — capture ID before any mutation
  const sourceItem = getItemAtPath(computedFormSchema.value, sourcePath)
  if (!sourceItem?.componentId) return
  const sourceId = sourceItem.componentId
  const sourceNode = canvasStore.findNode(sourceId)
  if (!sourceNode) return
  const clone: ComponentNode = JSON.parse(JSON.stringify(sourceNode))

  if (position === 'inside') {
    // SchemaTree emits targetPath = [...containerPath, 0] for 'inner' drops.
    // The actual container is at targetPath minus the trailing index.
    const containerPath = targetPath.slice(0, -1)
    const containerItem = getItemAtPath(computedFormSchema.value, containerPath)
    if (!containerItem?.componentId) return

    // Remove source, then add as child of container
    canvasStore.removeNode(sourceId)
    canvasStore.addNode(containerItem.componentId, clone)
    canvasStore.select(clone.id)
    return
  }

  // 'before' or 'after' — insert clone adjacent to the target
  const targetItem = getItemAtPath(computedFormSchema.value, targetPath)
  if (!targetItem?.componentId) return
  const targetId = targetItem.componentId

  // Capture parent context before mutation (removing source may shift indices)
  const targetParentPath = targetPath.slice(0, -1)
  const targetParentId = targetParentPath.length > 0
    ? getItemAtPath(computedFormSchema.value, targetParentPath)?.componentId ?? null
    : null

  // Remove source from its current location
  canvasStore.removeNode(sourceId)

  // Insert clone adjacent to target in the target's parent
  if (!targetParentId) {
    // Target is at the top level
    const arr = [...canvasStore.schema]
    const insertIdx = arr.findIndex((n) => n.id === targetId)
    if (insertIdx < 0) return
    arr.splice(position === 'after' ? insertIdx + 1 : insertIdx, 0, clone)
    canvasStore.schema = arr
  } else {
    // Target is nested — find parent by ID (stable across mutations)
    const parentNode = canvasStore.findNode(targetParentId)
    if (!parentNode?.children) return
    const insertIdx = parentNode.children.findIndex((n) => n.id === targetId)
    if (insertIdx < 0) return
    parentNode.children.splice(position === 'after' ? insertIdx + 1 : insertIdx, 0, clone)
  }

  canvasStore.pushHistory()
  canvasStore.select(clone.id)
}

function handleToggleHidden(path: number[], hidden: boolean) {
  const item = getItemAtPath(computedFormSchema.value, path)
  if (!item?.componentId) return
  const node = findNodeByFormSchemaId(item.componentId)
  if (!node) return
  canvasStore.updateNode(node.id, { props: { ...node.props, hidden } })
}

function handleValidate() {
  const result = validateSchema(computedFormSchema.value)
  validationErrorCount.value = result.errors.filter((e) => e.severity === 'error').length
  validationWarningCount.value = result.errors.filter((e) => e.severity === 'warning').length
  if (result.valid && validationWarningCount.value === 0) {
    ElMessage.success('Schema 校验通过')
  } else if (result.valid) {
    ElNotification({ title: 'Schema 校验', message: `${validationWarningCount.value} 个警告`, type: 'warning', duration: 4000 })
  } else {
    const msgs = result.errors.slice(0, 5).map(e => `• ${e.message}`).join('\n')
    ElNotification({ title: 'Schema 校验失败', message: msgs, type: 'error', duration: 6000 })
  }
}

// =====================================================================
// Canvas event handlers (EditorCanvas → canvas store)
// =====================================================================

function handleCanvasMove(id: string, transform: Transform) {
  canvasStore.moveNode(id, transform)
}

function handleCanvasResize(id: string, w: number, h: number) {
  canvasStore.resizeNode(id, w, h)
}

function handleCanvasDropNew(type: SchemaType, x: number, y: number, parentId: string | null = null) {
  const node = createComponentNode(type)
  node.transform.x = x
  node.transform.y = y
  canvasStore.addNode(parentId, node)
}

// =====================================================================
// Conversion: ComponentNode → FormSchemaItem
// =====================================================================

function componentNodeToFormSchema(node: ComponentNode): FormSchemaItem {
  const item: FormSchemaItem = {
    type: node.type,
    componentId: node.id,
    // Transform → layout fields
    width: node.transform.w ? `${node.transform.w}px` : undefined,
    height: node.transform.h ? `${node.transform.h}px` : undefined,
    // Style
    style: node.style && Object.keys(node.style).length > 0 ? { ...node.style } : undefined,
    // Core fields
    props: node.props && Object.keys(node.props).length > 0 ? { ...node.props } : undefined,
    field: node.field,
    // Data
    api: node.data.api,
    options: node.data.options,
    defaultValue: node.data.defaultValue as FormSchemaItem['defaultValue'],
    // Linkage
    linkages: node.linkage.rules,
    visibleOn: node.linkage.visibleOn,
    disabledOn: node.linkage.disabledOn,
    requiredOn: node.linkage.requiredOn,
    // Events → actions (take first 'emit' event as primary actions)
    ...(node.events.click ? { actions: node.events.click.map(eventToAction) } : {}),
    // Children
    children: node.children?.map((c) => componentNodeToFormSchema(c)),
  }

  // Preserve additional FormSchemaItem fields stored in props
  if (node.props.label) item.label = node.props.label as string
  if (node.props.text) item.text = node.props.text as string
  if (node.props.buttonType) item.buttonType = node.props.buttonType as FormSchemaItem['buttonType']
  if (node.props.icon) item.icon = node.props.icon as string
  if (node.props.buttons) item.buttons = node.props.buttons as FormSchemaItem['buttons']
  if (node.props.span) item.span = node.props.span as FormSchemaItem['span']
  if (node.props.colspan) item.colspan = node.props.colspan as number
  if (node.props.rowspan) item.rowspan = node.props.rowspan as number
  if (node.props.border !== undefined) item.border = node.props.border as boolean
  if (node.props.hideBorder) item.hideBorder = node.props.hideBorder as string[]
  if (node.props.permissionRoles) item.permissionRoles = node.props.permissionRoles as string[]
  if (node.props.readonly !== undefined) item.readonly = node.props.readonly as boolean
  if (node.props.customAttrs) item.customAttrs = node.props.customAttrs as Record<string, string>
  if (node.props.listApi) item.listApi = node.props.listApi as FormSchemaItem['listApi']
  if (node.props.searchFields) item.searchFields = node.props.searchFields as FormSchemaItem['searchFields']
  if (node.props.columns) item.columns = node.props.columns as FormSchemaItem['columns']
  if (node.props.rowActions) item.rowActions = node.props.rowActions as FormSchemaItem['rowActions']
  if (node.props.rules) item.rules = node.props.rules as FormSchemaItem['rules']
  if (node.props.hidden !== undefined) item.hidden = node.props.hidden as boolean

  return item
}

function eventToAction(event: import('@/components/FormGrid/types').ActionDef): import('@/components/FormGrid/types').SchemaAction {
  switch (event.type) {
    case 'emit': return { type: 'emit', eventName: event.eventName, eventPayload: event.payload as import('@/components/FormGrid/types').ActionPayload }
    case 'navigate': return { type: 'navigate', navigatePath: event.path, navigateQuery: event.query }
    case 'api': return { type: 'api', apiUrl: event.apiUrl, apiMethod: event.apiMethod }
    case 'dialog': return { type: 'dialog' }
    default: return { type: 'emit' }
  }
}

// =====================================================================
// Conversion: FormSchemaItem → ComponentNode
// =====================================================================

function formSchemaToComponentNode(item: FormSchemaItem): ComponentNode {
  const id = item.componentId ?? generateId(item.type)
  const w = parseSize(item.width) ?? 150
  const h = parseSize(item.height) ?? 44

  const node: ComponentNode = {
    id,
    type: item.type,
    field: item.field,
    transform: { x: 0, y: 0, w, h },
    zIndex: 1,
    style: item.style ? { ...item.style } : {},
    data: {
      api: item.api,
      options: item.options,
      defaultValue: item.defaultValue,
    },
    events: item.actions ? { click: item.actions.map(actionToEvent) } : {},
    linkage: {
      visibleOn: item.visibleOn,
      disabledOn: item.disabledOn,
      requiredOn: item.requiredOn,
      rules: item.linkages,
    },
    props: {
      ...(item.props ?? {}),
      // Store FormSchemaItem-specific fields in props for round-trip fidelity
      ...(item.label ? { label: item.label } : {}),
      ...(item.text ? { text: item.text } : {}),
      ...(item.buttonType ? { buttonType: item.buttonType } : {}),
      ...(item.icon ? { icon: item.icon } : {}),
      ...(item.buttons ? { buttons: item.buttons } : {}),
      ...(item.span !== undefined ? { span: item.span } : {}),
      ...(item.colspan !== undefined ? { colspan: item.colspan } : {}),
      ...(item.rowspan !== undefined ? { rowspan: item.rowspan } : {}),
      ...(item.border !== undefined ? { border: item.border } : {}),
      ...(item.hideBorder ? { hideBorder: item.hideBorder } : {}),
      ...(item.permissionRoles ? { permissionRoles: item.permissionRoles } : {}),
      ...(item.readonly !== undefined ? { readonly: item.readonly } : {}),
      ...(item.customAttrs ? { customAttrs: item.customAttrs } : {}),
      ...(item.listApi ? { listApi: item.listApi } : {}),
      ...(item.searchFields ? { searchFields: item.searchFields } : {}),
      ...(item.columns ? { columns: item.columns } : {}),
      ...(item.rowActions ? { rowActions: item.rowActions } : {}),
      ...(item.rules ? { rules: item.rules } : {}),
      ...(item.hidden !== undefined ? { hidden: item.hidden } : {}),
    },
    children: item.children?.map((c) => formSchemaToComponentNode(c)),
  }

  return node
}

function actionToEvent(action: import('@/components/FormGrid/types').SchemaAction): import('@/components/FormGrid/types').ActionDef {
  switch (action.type) {
    case 'emit': return { type: 'emit', eventName: action.eventName, payload: action.eventPayload }
    case 'navigate': return { type: 'navigate', path: action.navigatePath, query: action.navigateQuery }
    case 'api': return { type: 'api', apiUrl: action.apiUrl, apiMethod: action.apiMethod }
    case 'dialog': return { type: 'dialog' }
    default: return { type: 'emit' }
  }
}

function parseSize(val: string | undefined): number | undefined {
  if (!val) return undefined
  const m = val.match(/^(\d+(?:\.\d+)?)px$/)
  return m ? parseFloat(m[1]) : undefined
}

function generateId(type: SchemaType): string {
  const hash = Math.random().toString(36).slice(2, 7)
  return `${type}-${hash}`
}

// =====================================================================
// Merge: apply FormSchemaItem changes onto existing ComponentNode
// Preserves canvas-specific properties (id, transform, zIndex, style)
// =====================================================================

function mergeComponentNodeFromFormSchema(
  existing: ComponentNode,
  formItem: FormSchemaItem,
): Partial<ComponentNode> {
  const patch: Partial<ComponentNode> = {
    type: formItem.type,
    field: formItem.field,
    data: {
      ...existing.data,
      api: formItem.api,
      options: formItem.options,
      defaultValue: formItem.defaultValue,
    },
    events: formItem.actions ? { click: formItem.actions.map(actionToEvent) } : existing.events,
    linkage: {
      ...existing.linkage,
      visibleOn: formItem.visibleOn,
      disabledOn: formItem.disabledOn,
      requiredOn: formItem.requiredOn,
      rules: formItem.linkages,
    },
    props: {
      ...(formItem.props ?? {}),
      ...(formItem.label ? { label: formItem.label } : {}),
      ...(formItem.text ? { text: formItem.text } : {}),
      ...(formItem.buttonType ? { buttonType: formItem.buttonType } : {}),
      ...(formItem.icon ? { icon: formItem.icon } : {}),
      ...(formItem.buttons ? { buttons: formItem.buttons } : {}),
      ...(formItem.span !== undefined ? { span: formItem.span } : {}),
      ...(formItem.colspan !== undefined ? { colspan: formItem.colspan } : {}),
      ...(formItem.rowspan !== undefined ? { rowspan: formItem.rowspan } : {}),
      ...(formItem.border !== undefined ? { border: formItem.border } : {}),
      ...(formItem.hideBorder ? { hideBorder: formItem.hideBorder } : {}),
      ...(formItem.permissionRoles ? { permissionRoles: formItem.permissionRoles } : {}),
      ...(formItem.readonly !== undefined ? { readonly: formItem.readonly } : {}),
      ...(formItem.customAttrs ? { customAttrs: formItem.customAttrs } : {}),
      ...(formItem.listApi ? { listApi: formItem.listApi } : {}),
      ...(formItem.searchFields ? { searchFields: formItem.searchFields } : {}),
      ...(formItem.columns ? { columns: formItem.columns } : {}),
      ...(formItem.rowActions ? { rowActions: formItem.rowActions } : {}),
      ...(formItem.rules ? { rules: formItem.rules } : {}),
      ...(formItem.hidden !== undefined ? { hidden: formItem.hidden } : {}),
    },
  }

  // Preserve canvas-specific properties from existing node
  patch.id = existing.id
  patch.transform = existing.transform
  patch.zIndex = existing.zIndex
  patch.style = formItem.style ? { ...formItem.style } : existing.style

  // Recursively merge children
  if (formItem.children) {
    patch.children = formItem.children.map((childItem, i) => {
      const existingChild = existing.children?.[i]
      if (existingChild) {
        return { ...existingChild, ...mergeComponentNodeFromFormSchema(existingChild, childItem) }
      }
      return formSchemaToComponentNode(childItem)
    })
  }

  return patch
}
</script>

<template>
  <div class="editor-view">
    <el-alert
      v-if="apiStore.hasError"
      :title="apiStore.error ?? ''"
      type="error"
      show-icon
      closable
      class="editor-view__error"
      @close="apiStore.clearError?.()"
    />

    <EditorToolbar
      :mode="canvasMode"
      :schema="computedFormSchema"
      :schema-name="schemaName"
      :schema-id="currentSchemaId"
      :selected-index="selectedNodeIndex"
      :selected-indices="selectedNodeIndex !== null ? [selectedNodeIndex] : []"
      :schema-length="canvasSchema.length"
      :can-undo="canvasStore.canUndo"
      :can-redo="canvasStore.canRedo"
      :can-group="canGroup"
      :can-ungroup="canUngroup"
      :validation-error-count="validationErrorCount"
      :validation-warning-count="validationWarningCount"
      :left-panel-visible="leftPanelVisible"
      :right-panel-visible="rightPanelVisible"
      :preview-mode="'desktop'"
      :show-thumbnail="showThumbnail"
      :canvas-size-preset="canvasSizePreset"
      :selected-z-index="selectedZIndex"
      @update:schema-name="schemaName = $event"
      @update:left-panel-visible="leftPanelVisible = $event"
      @update:right-panel-visible="rightPanelVisible = $event"
      @update:mode="canvasStore.mode = $event"
      @save-draft="handleSaveDraft"
      @publish="handlePublish"
      @preview="handlePreview"
      @export="handleExport"
      @import="handleImport"
      @load-schema="handleLoadSchema"
      @copy="handleCopy"
      @delete="handleDelete"
      @move-up="handleMoveUp"
      @move-down="handleMoveDown"
      @align="handleAlign"
      @undo="handleUndo"
      @redo="handleRedo"
      @zindex-up="handleZIndexUp"
      @zindex-down="handleZIndexDown"
      @group="handleGroup"
      @ungroup="handleUngroup"
      @validate="handleValidate"
      @toggle-thumbnail="handleToggleThumbnail"
      @canvas-size-change="handleCanvasSizeChange"
    />

    <div class="editor-view__body">
      <!-- Left panel -->
      <aside
        v-if="canvasMode === 'edit' && leftPanelVisible"
        class="editor-view__left"
      >
        <div class="editor-view__tabs">
          <button
            class="editor-view__tab"
            :class="{ 'editor-view__tab--active': leftTab === 'components' }"
            @click="leftTab = 'components'"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="1" width="6" height="6" rx="1"/>
              <rect x="9" y="1" width="6" height="6" rx="1"/>
              <rect x="1" y="9" width="6" height="6" rx="1"/>
              <rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
            <span>组件库</span>
          </button>
          <button
            class="editor-view__tab"
            :class="{ 'editor-view__tab--active': leftTab === 'structure' }"
            @click="leftTab = 'structure'"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="1" y1="4" x2="6" y2="4"/>
              <line x1="1" y1="8" x2="10" y2="8"/>
              <line x1="1" y1="12" x2="8" y2="12"/>
              <circle cx="12" cy="4" r="2"/>
              <circle cx="14" cy="8" r="2"/>
              <circle cx="10" cy="12" r="2"/>
            </svg>
            <span>结构</span>
          </button>
        </div>

        <div class="editor-view__left-content">
          <ComponentPanel v-show="leftTab === 'components'" />
          <SchemaTree
            v-show="leftTab === 'structure'"
            :schema="computedFormSchema"
            :selected-path="selectedPath"
            @select="handleTreeSelect"
            @reorder="handleTreeReorder"
            @toggle-hidden="handleToggleHidden"
          />
        </div>

        <!-- Status bar at bottom of left panel -->
        <div v-if="currentSchemaId" class="editor-view__status-bar">
          <span class="editor-view__status-tag" :class="`editor-view__status-tag--${schemaStatus}`">
            {{ schemaStatus === 'published' ? '已发布' : '草稿' }}
          </span>
          <span class="editor-view__status-tag" :class="`editor-view__status-tag--${schemaType}`">
            {{ schemaType === 'form' ? '表单' : '搜索列表' }}
          </span>
        </div>
      </aside>

      <!-- Center canvas -->
      <div class="editor-view__center">
        <div class="editor-view__canvas-wrapper">
          <div class="editor-view__canvas">
            <EditorCanvas
              :schema="canvasSchema"
              :canvas-config="canvasConfig"
              :selected-id="selectedId"
              :mode="canvasMode"
              @select="handleSelect"
              @toggle-select="canvasStore.toggleSelect"
              @move="handleCanvasMove"
              @resize="handleCanvasResize"
              @drop-new="handleCanvasDropNew"
              @update:schema="handleSchemaUpdate"
            />
          </div>
        </div>

        <!-- Thumbnail overlay -->
        <div v-if="showThumbnail && canvasSchema.length > 0" class="editor-view__thumbnail" @click="handleThumbnailClick">
          <div class="editor-view__thumbnail-canvas">
            <div
              v-for="node in canvasSchema"
              :key="node.id"
              class="editor-view__thumbnail-item"
              :style="{ background: thumbColorMap[node.type] ?? '#fafbfc' }"
            />
          </div>
          <div class="editor-view__thumbnail-indicator" :style="indicatorStyle" />
        </div>
      </div>

      <!-- Right property panel (inline) -->
      <aside
        v-if="canvasMode === 'edit' && rightPanelVisible && (drawerVisible || selectedFormSchemaItem)"
        class="editor-view__right"
      >
        <div class="editor-view__right-header">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="8" r="6"/>
            <path d="M8 5v3l2 1"/>
          </svg>
          <span v-if="selectedFormSchemaItem">{{ (selectedFormSchemaItem as any).label || selectedFormSchemaItem?.type || '组件' }} 配置</span>
          <span v-else>编辑器配置</span>
          <button class="editor-view__right-close" @click="drawerVisible = false">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="4" y1="4" x2="12" y2="12"/>
              <line x1="12" y1="4" x2="4" y2="12"/>
            </svg>
          </button>
        </div>

        <PropertyPanel
          v-if="selectedFormSchemaItem"
          :schema="selectedFormSchemaItem"
          :all-schema="computedFormSchema"
          @update:schema="handlePropertyUpdate"
        />

        <div v-else class="editor-view__global-config">
          <p class="editor-view__global-hint">选择画布中的组件查看和编辑属性</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f0f2f5;

  &__body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  // ---- Left panel ----
  &__left {
    width: 240px;
    flex-shrink: 0;
    background: #fff;
    border-right: 1px solid #e4e7ed;
    display: flex;
    flex-direction: column;
    z-index: 2;
  }

  &__error {
    margin: 8px 16px 0;
    flex-shrink: 0;
  }

  &__tabs {
    display: flex;
    border-bottom: 1px solid #e4e7ed;
    flex-shrink: 0;
  }

  &__tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 8px 4px;
    font-size: 12px;
    font-weight: 500;
    color: #606266;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { color: #409eff; background: #f5f7fa; }
    &--active {
      color: #409eff;
      border-bottom-color: #409eff;
      background: #ecf5ff;
    }
  }

  &__left-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__status-bar {
    display: flex;
    gap: 6px;
    padding: 8px 12px;
    border-top: 1px solid #f0f2f5;
    flex-shrink: 0;
  }

  &__status-tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
    white-space: nowrap;

    &--draft { background: #f0f2f5; color: #909399; }
    &--published { background: #f0f9eb; color: #67c23a; }
    &--form { background: #ecf5ff; color: #409eff; }
    &--search-list { background: #ecf5ff; color: #409eff; }
  }

  // ---- Center canvas ----
  &__center {
    flex: 1;
    min-width: 0;
    overflow: auto;
    background: #e8eaed;
    padding: 24px;
    position: relative;
  }

  &__canvas-wrapper {
    margin: 0 auto;
  }

  &__canvas {
    background: #fff;
    border: 1px solid #dcdfe6;
    min-height: 600px;
  }

  // ---- Thumbnail ----
  &__thumbnail {
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 160px;
    background: #fff;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    cursor: pointer;
    z-index: 10;
  }

  &__thumbnail-canvas {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
  }

  &__thumbnail-item {
    height: 4px;
    border-radius: 1px;
    border: 1px solid #ebeef5;
  }

  &__thumbnail-indicator {
    position: absolute;
    top: 4px;
    left: 4px;
    border: 1.5px solid #409eff;
    background: rgba(64, 158, 255, 0.08);
    border-radius: 2px;
    pointer-events: none;
  }

  // ---- Right property panel (inline) ----
  &__right {
    width: 280px;
    flex-shrink: 0;
    background: #fff;
    border-left: 1px solid #e4e7ed;
    display: flex;
    flex-direction: column;
    z-index: 2;
    overflow: hidden;
  }

  &__right-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 600;
    color: #303133;
    border-bottom: 1px solid #f0f2f5;
    flex-shrink: 0;
  }

  &__right-close {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    color: #909399;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;

    &:hover {
      background: #f0f2f5;
      color: #606266;
    }
  }

  &__global-config {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  &__global-hint {
    text-align: center;
    color: #c0c4cc;
    font-size: 13px;
    line-height: 1.6;
  }
}
</style>
