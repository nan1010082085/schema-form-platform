<script setup lang="ts">
/**
 * EditorView — 可视化 Schema 编辑器
 *
 * 三栏布局：顶部工具栏 / 左侧(组件面板/结构树) + 中间画布 + 右侧属性面板
 * 左侧与右侧均为内联 flex 面板，通过工具栏按钮切换显隐
 * 支持 30 步历史回退/前进
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import EditorToolbar from '@/components/Editor/EditorToolbar.vue'
import ComponentPanel from '@/components/Editor/ComponentPanel.vue'
import EditorCanvas from '@/components/Editor/EditorCanvas.vue'
import PropertyPanel from '@/components/Editor/PropertyPanel.vue'
import SchemaTree from '@/components/Editor/SchemaTree.vue'
import type { FormSchemaItem } from '@/components/FormGrid/types'
import { useHistory } from '@/composables/useHistory'
import { MAX_HISTORY_SIZE } from '@/composables/useConstant'
import { useModeControl } from '@/composables/useModeControl'
import { useInteractionControl } from '@/composables/useInteractionControl'
import { useEditorLayout } from '@/composables/useEditorLayout'
import { useRightPanelConfig } from '@/composables/useRightPanelConfig'
import { useLeftPanelManage } from '@/composables/useLeftPanelManage'
import { useDragEditor } from '@/composables/useDragEditor'
import { useSchemaStore } from '@/stores/schema'
import {
  groupAsContainer,
  ungroupContainer,
  isContainerType,
  getItemAtPath,
  removeAtPath,
  insertAtPath,
  comparePaths,
} from '@/utils/schemaTransform'
import { validateSchema } from '@/utils/schemaValidate'

const route = useRoute()
const router = useRouter()
const schemaStore = useSchemaStore()

// ---- History (30 steps) ----
const { pushState, undo, redo, canUndo, canRedo } = useHistory({ maxSize: MAX_HISTORY_SIZE })

// ---- Core editor state ----
const schema = ref<FormSchemaItem[]>([])
const selectedPath = ref<number[] | null>(null)
const selectedPaths = ref<number[][]>([])

// ---- Composables ----
const currentSchemaId = ref<string | null>(null)
const { mode, handlePreview } = useModeControl({ schema, currentSchemaId })
const { previewMode } = useInteractionControl()
const { leftPanelVisible, rightPanelVisible, leftTab } = useEditorLayout()
const {
  drawerVisible, selectedSchema, handleSelect, handleOpenProperties,
  handlePropertyUpdate, replaceAtPath,
} = useRightPanelConfig({ schema, selectedPath, selectedPaths, pushState })
const { handleTreeSelect, handleTreeReorder, handleToggleHidden } = useLeftPanelManage({
  schema, selectedPath, selectedPaths, drawerVisible, pushState, replaceAtPath,
})
const { handleDragReorder, handleDropToContainer, handleDragToContainer } = useDragEditor({
  schema, selectedPath, selectedPaths, pushState,
})

// ---- Canvas ----
const showThumbnail = ref(true)
const canvasSizePreset = ref('1920x1080')

const canvasSizeMap: Record<string, { w: number; h: number }> = {
  '1920x1080': { w: 1920, h: 1080 },
  '1440x900': { w: 1440, h: 900 },
  '1366x768': { w: 1366, h: 768 },
}
const canvasWidth = computed(() => canvasSizeMap[canvasSizePreset.value]?.w ?? 1920)
const canvasHeight = computed(() => canvasSizeMap[canvasSizePreset.value]?.h ?? 1080)

// ---- Schema identity ----
const schemaName = ref('')
const schemaType = ref<'form' | 'search-list'>('form')
const schemaStatus = ref<'draft' | 'published'>('draft')
const lastSavedJson = ref('')
let lastSavedName = ''

// ---- Load schema from route query ----
onMounted(async () => {
  const id = route.query.id as string | undefined
  if (id) {
    const detail = await schemaStore.fetchSchemaById(id)
    if (detail?.json) {
      schema.value = detail.json
      currentSchemaId.value = detail.id
      schemaName.value = detail.name
      schemaType.value = detail.type
      lastSavedJson.value = JSON.stringify(detail.json)
      lastSavedName = detail.name
      pushState(schema.value)

      // Check if a published version exists
      const published = await schemaStore.fetchPublishedSchema(detail.id)
      schemaStatus.value = published ? 'published' : 'draft'
    }
  }
})

// ---- Unsaved changes detection ----
const isDirty = computed(() => {
  return JSON.stringify(schema.value) !== lastSavedJson.value ||
         schemaName.value !== lastSavedName
})

// ---- beforeRouteLeave guard ----
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

// ---- Selection derived state ----
const selectedIndex = computed<number | null>(() => selectedPath.value?.[0] ?? null)
const selectedIndices = computed<number[]>(() => selectedPaths.value.map((p) => p[0]))

// ---- Validation ----
const validationErrorCount = ref(0)
const validationWarningCount = ref(0)

// ---- Group/Ungroup ----
const canGroup = computed(() => selectedPaths.value.length > 0)
const canUngroup = computed(() => {
  if (!selectedPath.value) return false
  const item = getItemAtPath(schema.value, selectedPath.value)
  return item !== undefined && isContainerType(item)
})

// ---- Save / Publish ----
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

  const result = await schemaStore.saveFromEditor(
    schema.value,
    schemaName.value,
    currentSchemaId.value ?? undefined,
  )

  if (result) {
    lastSavedJson.value = JSON.stringify(schema.value)
    lastSavedName = schemaName.value
    if (!currentSchemaId.value) {
      currentSchemaId.value = result.id
      schemaStatus.value = 'draft'
      router.replace({ path: '/editor', query: { id: result.id } })
      const detail = await schemaStore.fetchSchemaById(result.id)
      if (detail?.json) {
        schema.value = detail.json
        lastSavedJson.value = JSON.stringify(detail.json)
      }
    } else {
      schemaStatus.value = 'draft'
    }
    ElMessage.success('草稿已保存')
  } else {
    ElMessage.error(schemaStore.error || '保存失败')
  }
}

async function handlePublish() {
  if (!currentSchemaId.value) {
    await handleSaveDraft()
    if (!currentSchemaId.value) return
  }
  if (isDirty.value) await handleSaveDraft()

  const result = await schemaStore.publishSchema(currentSchemaId.value)
  if (result) {
    schemaStatus.value = 'published'
    lastSavedJson.value = JSON.stringify(schema.value)
    ElMessage.success('已发布！')
  } else {
    ElMessage.error(schemaStore.error || '发布失败')
  }
}

// ---- Import / Export ----
function handleImport(importedSchema: FormSchemaItem[]) {
  pushState(schema.value)
  schema.value = importedSchema
}

function handleLoadSchema(loadedSchema: FormSchemaItem[]) {
  pushState(schema.value)
  schema.value = loadedSchema
}

function handleExport() {
  const json = JSON.stringify(schema.value, null, 2)
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

// ---- Canvas controls ----
function handleToggleThumbnail() {
  showThumbnail.value = !showThumbnail.value
}

function handleCanvasSizeChange(preset: string) {
  canvasSizePreset.value = preset
}

// ---- Thumbnail ----
const thumbScale = 12
const thumbColorMap: Record<string, string> = {
  'page': '#e8f4fd', 'card': '#fff', 'toolbar': '#f5f7fa',
  'grid-row': '#fafbfc', 'grid-col': '#fafbfc',
  'title': '#e8f4fd', 'table': '#ecf5ff', 'search-list': '#ecf5ff',
  'input': '#fff', 'number': '#fff', 'select': '#fff',
}
function thumbItemStyle(item: FormSchemaItem) {
  return { background: thumbColorMap[item.type] ?? '#fafbfc' }
}
const indicatorStyle = computed(() => ({
  width: `${Math.round(canvasWidth.value / thumbScale)}px`,
  height: `${Math.round(canvasHeight.value / thumbScale)}px`,
}))
function handleThumbnailClick(_e: MouseEvent) {
  // Scroll to corresponding position (simplified)
}

// ---- Toolbar operations ----
function handleSchemaUpdate(newSchema: FormSchemaItem[]) {
  pushState(schema.value)
  schema.value = newSchema
}

function handleCopy() {
  if (!selectedPath.value) return
  pushState(schema.value)
  const source = getItemAtPath(schema.value, selectedPath.value)
  if (!source) return
  const copy = JSON.parse(JSON.stringify(source)) as FormSchemaItem
  const parentPath = selectedPath.value.slice(0, -1)
  const insertIdx = selectedPath.value[selectedPath.value.length - 1] + 1
  schema.value = insertAtPath(schema.value, parentPath, insertIdx, copy)
  selectedPath.value = [...parentPath, insertIdx]
  selectedPaths.value = [selectedPath.value]
}

function handleDelete() {
  if (selectedPaths.value.length === 0) return
  pushState(schema.value)
  const sorted = [...selectedPaths.value].sort(comparePaths).reverse()
  let newSchema = schema.value
  for (const path of sorted) { newSchema = removeAtPath(newSchema, path) }
  schema.value = newSchema
  selectedPath.value = null
  selectedPaths.value = []
  drawerVisible.value = false
}

function handleMoveUp() {
  if (!selectedPath.value || selectedPath.value.length !== 1) return
  const idx = selectedPath.value[0]
  if (idx === 0) return
  pushState(schema.value)
  const arr = [...schema.value]
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
  schema.value = arr
  selectedPath.value = [idx - 1]
  selectedPaths.value = [selectedPath.value]
}

function handleMoveDown() {
  if (!selectedPath.value || selectedPath.value.length !== 1) return
  const idx = selectedPath.value[0]
  if (idx >= schema.value.length - 1) return
  pushState(schema.value)
  const arr = [...schema.value]
  ;[arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]
  schema.value = arr
  selectedPath.value = [idx + 1]
  selectedPaths.value = [selectedPath.value]
}

function handleAlign(align: 'left' | 'center' | 'right') {
  if (!selectedPath.value) return
  pushState(schema.value)
  const item = getItemAtPath(schema.value, selectedPath.value)
  if (!item) return
  schema.value = replaceAtPath(schema.value, selectedPath.value, { ...item, align })
}

function handleUndo() { const state = undo(); if (state) schema.value = state }
function handleRedo() { const state = redo(); if (state) schema.value = state }

function handleGroup(containerType: 'card' | 'page' | 'toolbar') {
  if (selectedIndices.value.length === 0) return
  pushState(schema.value)
  schema.value = groupAsContainer(schema.value, selectedIndices.value, containerType)
  const minIdx = Math.min(...selectedIndices.value)
  selectedPath.value = [minIdx]
  selectedPaths.value = [selectedPath.value]
}

function handleUngroup() {
  if (!selectedPath.value) return
  const item = getItemAtPath(schema.value, selectedPath.value)!
  if (!isContainerType(item) || selectedPath.value.length > 1) return
  pushState(schema.value)
  const idx = selectedPath.value[0]
  schema.value = ungroupContainer(schema.value, idx)
  selectedPath.value = idx < schema.value.length ? [idx] : (schema.value.length > 0 ? [schema.value.length - 1] : null)
  selectedPaths.value = selectedPath.value ? [selectedPath.value] : []
}

function handleValidate() {
  const result = validateSchema(schema.value)
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
</script>

<template>
  <div class="editor-view">
    <el-alert
      v-if="schemaStore.hasError"
      :title="schemaStore.error ?? ''"
      type="error"
      show-icon
      closable
      class="editor-view__error"
      @close="schemaStore.clearError?.()"
    />

    <EditorToolbar
      :mode="mode"
      :schema="schema"
      :schema-name="schemaName"
      :schema-id="currentSchemaId"
      :selected-index="selectedIndex"
      :selected-indices="selectedIndices"
      :schema-length="schema.length"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :can-group="canGroup"
      :can-ungroup="canUngroup"
      :validation-error-count="validationErrorCount"
      :validation-warning-count="validationWarningCount"
      :left-panel-visible="leftPanelVisible"
      :right-panel-visible="rightPanelVisible"
      :preview-mode="previewMode"
      :show-thumbnail="showThumbnail"
      :canvas-size-preset="canvasSizePreset"
      @update:schema-name="schemaName = $event"
      @update:left-panel-visible="leftPanelVisible = $event"
      @update:right-panel-visible="rightPanelVisible = $event"
      @update:mode="mode = $event"
      @update:preview-mode="previewMode = $event"
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
      @group="handleGroup"
      @ungroup="handleUngroup"
      @validate="handleValidate"
      @toggle-thumbnail="handleToggleThumbnail"
      @canvas-size-change="handleCanvasSizeChange"
    />

    <div class="editor-view__body">
      <!-- Left panel -->
      <aside
        v-if="mode === 'edit' && leftPanelVisible"
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
            :schema="schema"
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
              :schema="schema"
              :selected-index="selectedIndex"
              :selected-indices="selectedIndices"
              :mode="mode"
              :canvas-width="canvasWidth"
              :canvas-height="canvasHeight"
              @update:schema="handleSchemaUpdate"
              @select="handleSelect"
              @open-properties="handleOpenProperties"
              @drag-reorder="handleDragReorder"
              @drop-to-container="handleDropToContainer"
              @drag-to-container="handleDragToContainer"
            />
          </div>
        </div>

        <!-- Thumbnail overlay -->
        <div v-if="showThumbnail && schema.length > 0" class="editor-view__thumbnail" @click="handleThumbnailClick">
          <div class="editor-view__thumbnail-canvas">
            <div
              v-for="(item, idx) in schema"
              :key="idx"
              class="editor-view__thumbnail-item"
              :style="thumbItemStyle(item)"
            />
          </div>
          <div class="editor-view__thumbnail-indicator" :style="indicatorStyle" />
        </div>
      </div>

      <!-- Right property panel (inline) -->
      <aside
        v-if="mode === 'edit' && rightPanelVisible && (drawerVisible || selectedSchema)"
        class="editor-view__right"
      >
        <div class="editor-view__right-header">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="8" r="6"/>
            <path d="M8 5v3l2 1"/>
          </svg>
          <span v-if="selectedSchema">{{ (selectedSchema as any).label || selectedSchema?.type || '组件' }} 配置</span>
          <span v-else>编辑器配置</span>
          <button class="editor-view__right-close" @click="drawerVisible = false">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="4" y1="4" x2="12" y2="12"/>
              <line x1="12" y1="4" x2="4" y2="12"/>
            </svg>
          </button>
        </div>

        <PropertyPanel
          v-if="selectedSchema"
          :schema="selectedSchema"
          :all-schema="schema"
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
