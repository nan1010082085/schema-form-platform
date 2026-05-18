<script setup lang="ts">
/**
 * EditorView — 可视化 Schema 编辑器
 *
 * 三栏布局：左侧(可折叠组件面板/结构树) / 中间(el-scrollbar+画布) / 右侧(el-drawer 覆盖层)
 * 左侧面板通过 transform 收起，与画布同级布局；右侧为上层覆盖抽屉
 * 支持 30 步历史回退/前进
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { Fold, Expand } from '@element-plus/icons-vue'
import EditorToolbar from '@/components/Editor/EditorToolbar.vue'
import ComponentPanel from '@/components/Editor/ComponentPanel.vue'
import EditorCanvas from '@/components/Editor/EditorCanvas.vue'
import PropertyPanel from '@/components/Editor/PropertyPanel.vue'
import JsonImporter from '@/components/Editor/JsonImporter.vue'
import SchemaTree from '@/components/Editor/SchemaTree.vue'
import type { FormSchemaItem } from '@/components/FormGrid/types'
import { useHistory } from '@/composables/useHistory'
import { useSchemaStore } from '@/stores/schema'
import { processSchema } from '@/utils/requestQueue'
import {
  groupAsContainer,
  ungroupContainer,
  isContainerType,
  getItemAtPath,
  removeAtPath,
  insertAtPath,
  flattenToPaths,
  comparePaths,
} from '@/utils/schemaTransform'
import { validateSchema } from '@/utils/schemaValidate'

const route = useRoute()
const router = useRouter()
const schemaStore = useSchemaStore()

// ---- History (30 steps) ----
const { pushState, undo, redo, canUndo, canRedo } = useHistory({ maxSize: 30 })

// ---- Editor state ----
const schema = ref<FormSchemaItem[]>([])
const mode = ref<'edit' | 'preview'>('edit')
const leftTab = ref<'components' | 'structure'>('components')
const leftCollapsed = ref(false)

// ---- Schema identity ----
const currentSchemaId = ref<string | null>(null)
const schemaName = ref('')
const schemaType = ref<'form' | 'search-list'>('form')
const schemaStatus = ref<'draft' | 'published'>('draft')
const lastSavedJson = ref('')
let lastSavedName = ''

// ---- Canvas ----
const showThumbnail = ref(true)
const canvasSizePreset = ref('1920×1080')
const canvasWidth = ref(1920)
const canvasHeight = ref(1080)

const canvasSizePresets = [
  { label: '1920×1080', value: '1920×1080' },
  { label: '1440×900', value: '1440×900' },
  { label: '1366×768', value: '1366×768' },
]

// ---- Right drawer (overlay) ----
const drawerVisible = ref(false)

// ---- Selection state ----
const selectedPath = ref<number[] | null>(null)
const selectedPaths = ref<number[][]>([])

const selectedIndex = computed<number | null>(() => selectedPath.value?.[0] ?? null)

const selectedIndices = computed<number[]>(() =>
  selectedPaths.value.map((p) => p[0]),
)

const selectedSchema = computed<FormSchemaItem | null>(() => {
  if (!selectedPath.value) return null
  return getItemAtPath(schema.value, selectedPath.value) ?? null
})

const canGroup = computed(() => selectedPaths.value.length > 0)
const canUngroup = computed(() => {
  if (!selectedPath.value) return false
  const item = getItemAtPath(schema.value, selectedPath.value)
  return item !== undefined && isContainerType(item)
})

// ---- Validation ----
const validationErrorCount = ref(0)
const validationWarningCount = ref(0)

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
      schemaStatus.value = detail.status
      lastSavedJson.value = JSON.stringify(detail.json)
      lastSavedName = detail.name
      pushState(schema.value)
    }
  }
})

// ---- processSchema on preview mode ----
watch(mode, async (newMode) => {
  if (newMode === 'preview' && schema.value.length > 0) {
    await processSchema(schema.value)
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

// ---- Save / Publish / Preview ----
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

  if (isDirty.value) {
    await handleSaveDraft()
  }

  const result = await schemaStore.updateSchema(currentSchemaId.value, {
    json: schema.value,
    status: 'published',
  })

  if (result) {
    schemaStatus.value = 'published'
    lastSavedJson.value = JSON.stringify(schema.value)
    ElMessage.success('已发布！')
  }
}

function handlePreview() {
  if (currentSchemaId.value) {
    window.open(`/preview?id=${currentSchemaId.value}`, '_blank')
  }
}

function handleToggleThumbnail() {
  showThumbnail.value = !showThumbnail.value
}

function toggleLeftPanel() {
  leftCollapsed.value = !leftCollapsed.value
}

// ---- Canvas size ----
function handleCanvasSizeChange(preset: string) {
  canvasSizePreset.value = preset
  const [w, h] = preset.split('×').map(Number)
  canvasWidth.value = w
  canvasHeight.value = h
}

const canvasStyle = computed(() => ({
  width: `${canvasWidth.value}px`,
  height: `${canvasHeight.value}px`,
}))

// ---- Drawer ----
watch(selectedSchema, (val) => {
  if (val) drawerVisible.value = true
})

function handleSelect(index: number | null, ctrl?: boolean, shift?: boolean) {
  if (index === null) {
    selectedPath.value = null
    selectedPaths.value = []
    drawerVisible.value = false
    return
  }

  const clickedPath = [index]
  if (shift && selectedPath.value && selectedPath.value.length === 1) {
    const fromIdx = selectedPath.value[0]
    const toIdx = index
    const minIdx = Math.min(fromIdx, toIdx)
    const maxIdx = Math.max(fromIdx, toIdx)
    const allPaths = flattenToPaths(schema.value)
    const topLevelPaths = allPaths.filter((p) => p.length === 1)
    const rangePaths = topLevelPaths.filter((p) => p[0] >= minIdx && p[0] <= maxIdx)
    selectedPaths.value = rangePaths
    selectedPath.value = clickedPath
  } else if (ctrl) {
    const key = clickedPath.join(',')
    const existingIdx = selectedPaths.value.findIndex((p) => p.join(',') === key)
    if (existingIdx >= 0) {
      selectedPaths.value = selectedPaths.value.filter((_, i) => i !== existingIdx)
      if (selectedPath.value?.join(',') === key) {
        selectedPath.value = selectedPaths.value.length > 0
          ? selectedPaths.value[selectedPaths.value.length - 1]
          : null
      }
    } else {
      selectedPaths.value = [...selectedPaths.value, clickedPath]
      selectedPath.value = clickedPath
    }
  } else {
    selectedPath.value = clickedPath
    selectedPaths.value = [clickedPath]
  }
  drawerVisible.value = true
}

function handleTreeSelect(path: number[]) {
  selectedPath.value = path
  selectedPaths.value = [path]
  drawerVisible.value = true
}

// ---- Property update ----
function handlePropertyUpdate(updatedItem: FormSchemaItem) {
  if (!selectedPath.value) return
  pushState(schema.value)
  schema.value = replaceAtPath(schema.value, selectedPath.value, updatedItem)
}

function replaceAtPath(items: FormSchemaItem[], path: number[], newItem: FormSchemaItem): FormSchemaItem[] {
  if (path.length === 0) return items
  const result = JSON.parse(JSON.stringify(items)) as FormSchemaItem[]
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

// ---- Toolbar operations ----
function handleModeChange(newMode: 'edit' | 'preview') { mode.value = newMode }

function handleSchemaUpdate(newSchema: FormSchemaItem[]) {
  pushState(schema.value)
  schema.value = newSchema
}

function handleImport(newSchema: FormSchemaItem[]) {
  pushState(schema.value)
  schema.value = newSchema
  selectedPath.value = null
  selectedPaths.value = []
}

function handleLoadSchema(loaded: FormSchemaItem[]) {
  schema.value = loaded
  pushState(schema.value)
  selectedPath.value = null
  selectedPaths.value = []
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

// ---- Drag-and-drop ----
function handleDragReorder(fromIndex: number, toIndex: number) {
  pushState(schema.value)
  const arr = [...schema.value]
  const [moved] = arr.splice(fromIndex, 1)
  arr.splice(toIndex, 0, moved)
  schema.value = arr
  selectedPath.value = [toIndex]
  selectedPaths.value = [selectedPath.value]
}

function handleDropToContainer(parentPath: number[], index: number, item: FormSchemaItem) {
  pushState(schema.value)
  schema.value = insertAtPath(schema.value, parentPath, index, item)
  selectedPath.value = [...parentPath, index]
  selectedPaths.value = [selectedPath.value]
}

function handleDragToContainer(sourcePath: number[], targetPath: number[], targetIndex: number) {
  const targetStr = targetPath.join(',')
  const sourceStr = sourcePath.join(',')
  if (targetStr.startsWith(sourceStr + ',') || targetStr === sourceStr) return
  const item = getItemAtPath(schema.value, sourcePath)
  if (!item) return
  pushState(schema.value)
  const clonedItem = JSON.parse(JSON.stringify(item)) as FormSchemaItem
  let newSchema = removeAtPath(schema.value, sourcePath)
  const adjustedTargetPath = adjustTarget(sourcePath, targetPath)
  schema.value = insertAtPath(newSchema, adjustedTargetPath, targetIndex, clonedItem)
  selectedPath.value = [...adjustedTargetPath, targetIndex]
  selectedPaths.value = [selectedPath.value]
}

function adjustTarget(sourcePath: number[], targetPath: number[]): number[] {
  const minLen = Math.min(sourcePath.length, targetPath.length)
  for (let level = 0; level < minLen; level++) {
    if (sourcePath[level] !== targetPath[level]) {
      if (level === sourcePath.length - 1 && level === targetPath.length - 1 && sourcePath[level] < targetPath[level]) {
        const adjusted = [...targetPath]
        adjusted[level]--
        return adjusted
      }
      return targetPath
    }
  }
  return targetPath
}

// ---- Import / Export ----
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

const jsonImporterRef = ref<InstanceType<typeof JsonImporter> | null>(null)
function handleOpenJsonImporter() { jsonImporterRef.value?.open() }
function handleJsonImport(newSchema: FormSchemaItem[]) {
  pushState(schema.value)
  schema.value = [...schema.value, ...newSchema]
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
      :selected-index="selectedIndex"
      :selected-indices="selectedIndices"
      :schema-length="schema.length"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :can-group="canGroup"
      :can-ungroup="canUngroup"
      :schema="schema"
      :schema-name="schemaName || ''"
      :schema-id="currentSchemaId"
      :show-thumbnail="showThumbnail"
      :canvas-size-preset="canvasSizePreset"
      :validation-error-count="validationErrorCount"
      :validation-warning-count="validationWarningCount"
      @save-draft="handleSaveDraft"
      @publish="handlePublish"
      @preview="handlePreview"
      @toggle-thumbnail="handleToggleThumbnail"
      @canvas-size-change="handleCanvasSizeChange"
      @import="handleImport"
      @import-response="handleOpenJsonImporter"
      @export="handleExport"
      @update:mode="handleModeChange"
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
    />

    <div class="editor-view__body">
      <!-- Left panel: same layout level as canvas, collapses with transform -->
      <aside
        v-if="mode === 'edit'"
        class="editor-view__left"
        :class="{ 'editor-view__left--collapsed': leftCollapsed }"
      >
        <div class="editor-view__name-area">
          <el-input
            v-model="schemaName"
            placeholder="未命名实例"
            size="large"
            class="editor-view__name-input"
          />
          <div v-if="currentSchemaId" class="editor-view__meta">
            <el-tag size="small" :type="schemaStatus === 'published' ? 'success' : 'info'">
              {{ schemaStatus === 'published' ? '已发布' : '草稿' }}
            </el-tag>
            <el-tag size="small" :type="schemaType === 'form' ? '' : 'success'">
              {{ schemaType === 'form' ? '表单' : '搜索列表' }}
            </el-tag>
          </div>
        </div>

        <div class="editor-view__tabs">
          <button
            class="editor-view__tab"
            :class="{ 'editor-view__tab--active': leftTab === 'components' }"
            @click="leftTab = 'components'"
          >组件</button>
          <button
            class="editor-view__tab"
            :class="{ 'editor-view__tab--active': leftTab === 'structure' }"
            @click="leftTab = 'structure'"
          >结构</button>
        </div>

        <el-scrollbar class="editor-view__left-scrollbar">
          <ComponentPanel v-show="leftTab === 'components'" />
          <SchemaTree
            v-show="leftTab === 'structure'"
            :schema="schema"
            :selected-path="selectedPath"
            @select="handleTreeSelect"
          />
        </el-scrollbar>
      </aside>

      <!-- Collapse toggle button -->
      <button
        v-if="mode === 'edit'"
        class="editor-view__left-toggle"
        @click="toggleLeftPanel"
      >
        <el-icon :size="14"><Fold v-if="!leftCollapsed" /><Expand v-else /></el-icon>
      </button>

      <!-- Center canvas -->
      <div class="editor-view__center">
        <el-scrollbar class="editor-view__scrollbar">
          <div class="editor-view__canvas" :style="canvasStyle">
            <EditorCanvas
              :schema="schema"
              :selected-index="selectedIndex"
              :selected-indices="selectedIndices"
              :mode="mode"
              :canvas-width="canvasWidth"
              :canvas-height="canvasHeight"
              @update:schema="handleSchemaUpdate"
              @select="handleSelect"
              @drag-reorder="handleDragReorder"
              @drop-to-container="handleDropToContainer"
              @drag-to-container="handleDragToContainer"
            />
          </div>
        </el-scrollbar>

        <!-- Thumbnail mini-map -->
        <div v-if="showThumbnail && mode === 'edit'" class="editor-view__thumbnail">
          <div class="editor-view__thumbnail-inner">
            <div
              class="editor-view__thumbnail-content"
              :style="{
                width: `${Math.round(canvasWidth / 10)}px`,
                height: `${Math.round(canvasHeight / 10)}px`,
              }"
            >
              <div class="editor-view__thumbnail-indicator" />
            </div>
          </div>
        </div>
      </div>

      <!-- Right drawer: overlay layer, not in layout flow -->
      <el-drawer
        v-model="drawerVisible"
        direction="rtl"
        size="380px"
        :close-on-click-modal="false"
        :modal="true"
        append-to-body
      >
        <template #header>
          <span v-if="selectedSchema" class="editor-view__drawer-title">
            {{ (selectedSchema as any).label || selectedSchema?.type || '组件' }} 配置
          </span>
          <span v-else>编辑器配置</span>
        </template>

        <PropertyPanel
          v-if="selectedSchema"
          :schema="selectedSchema"
          :all-schema="schema"
          @update:schema="handlePropertyUpdate"
        />

        <div v-else class="editor-view__global-config">
          <h3>全局设置</h3>
          <el-form label-position="top">
            <el-form-item label="画布尺寸">
              <el-select v-model="canvasSizePreset" @change="handleCanvasSizeChange">
                <el-option
                  v-for="p in canvasSizePresets"
                  :key="p.value"
                  :label="p.label"
                  :value="p.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="显示缩略图">
              <el-switch v-model="showThumbnail" />
            </el-form-item>
          </el-form>
          <el-divider />
          <el-button type="primary" @click="router.push('/instances')">
            返回实例管理
          </el-button>
        </div>
      </el-drawer>
    </div>

    <JsonImporter ref="jsonImporterRef" @import="handleJsonImport" />
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
    position: relative;
  }

  // ---- Left panel: same level as canvas, collapse via transform ----
  &__left {
    width: 260px;
    flex-shrink: 0;
    background: #fff;
    border-right: 1px solid #e4e7ed;
    display: flex;
    flex-direction: column;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.3s ease;
    z-index: 2;

    &--collapsed {
      width: 0;
      transform: translateX(-100%);
      overflow: hidden;
      opacity: 0;
    }
  }

  &__error {
    margin: 8px 16px 0;
    flex-shrink: 0;
  }

  &__name-area {
    padding: 14px 12px;
    border-bottom: 1px solid #f0f0f0;
  }

  &__name-input {
    :deep(.el-input__inner) { font-weight: 600; font-size: 15px; }
  }

  &__meta {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  &__tabs {
    display: flex;
    border-bottom: 1px solid #e4e7ed;
    flex-shrink: 0;
  }

  &__tab {
    flex: 1;
    padding: 10px 8px;
    font-size: 13px;
    font-weight: 500;
    color: #606266;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { color: #409eff; background: #f5f7fa; }
    &--active { color: #409eff; border-bottom-color: #409eff; }
  }

  &__left-scrollbar {
    flex: 1;
    min-height: 0;
  }

  // ---- Left panel collapse toggle ----
  &__left-toggle {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 3;
    width: 22px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-left: none;
    border-radius: 0 6px 6px 0;
    cursor: pointer;
    color: #909399;
    transition: all 0.2s;

    &:hover { color: #409eff; background: #ecf5ff; }
  }

  // ---- Center canvas ----
  &__center {
    flex: 1;
    min-width: 0;
    position: relative;
    background: #e0e3e8;
  }

  &__scrollbar {
    height: 100%;
  }

  &__canvas {
    background: #fff;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
    margin: 24px;
  }

  // ---- Thumbnail ----
  &__thumbnail {
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 200px;
    height: 120px;
    background: #fff;
    border: 2px solid #c0c4cc;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  &__thumbnail-inner {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  &__thumbnail-content {
    background: #fafafa;
    border: 1px solid #e0e0e0;
    margin: 8px auto;
    position: relative;
  }

  &__thumbnail-indicator {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 1px solid #f56c6c;
    pointer-events: none;
  }

  // ---- Drawer title ----
  &__drawer-title {
    font-weight: 600;
    font-size: 15px;
  }

  // ---- Global config (shown when nothing selected) ----
  &__global-config {
    padding: 8px 0;

    h3 { font-size: 16px; margin: 0 0 16px; color: #303133; }
  }
}
</style>
