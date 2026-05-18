<script setup lang="ts">
/**
 * EditorToolbar — 编辑器顶部工具栏 (Phase 4-5 redesign)
 *
 * Layout: full-width evenly distributed groups (no left-right split).
 * Icons: L/C/R text replaced with inline SVG alignment icons.
 * Low-frequency ops (Load/Import/Export) moved into a "More" dropdown.
 *
 * Group order (left to right):
 *   Undo/Redo | Copy/Delete/MoveUp/MoveDown | AlignLeft/Center/Right
 *   | Group/Ungroup | Validate
 * Right side:
 *   Save/Publish/Preview | CanvasSize/Thumbnail | More(···)
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  CopyDocument,
  Delete,
  Top,
  Bottom,
  RefreshLeft,
  RefreshRight,
  FolderAdd,
  FolderRemove,
  CircleCheck,
  Warning,
  View,
  FullScreen,
  Promotion,
  MoreFilled,
} from '@element-plus/icons-vue'
import type { FormSchemaItem } from '@/components/FormGrid/types'
import type { SchemaListItem } from '@/types/api'
import { useSchemaStore } from '@/stores/schema'

const props = defineProps<{
  mode: 'edit' | 'preview'
  selectedIndex: number | null
  selectedIndices: number[]
  schemaLength: number
  canUndo: boolean
  canRedo: boolean
  canGroup: boolean
  canUngroup: boolean
  /** Current editor schema array (for server operations) */
  schema: FormSchemaItem[]
  /** Validation error count */
  validationErrorCount?: number
  /** Validation warning count */
  validationWarningCount?: number
  /** Schema name for display */
  schemaName?: string
  /** Current schema ID (null when new) */
  schemaId?: string | null
  /** Thumbnail toggle state */
  showThumbnail?: boolean
  /** Current canvas size preset */
  canvasSizePreset?: string
}>()

const emit = defineEmits<{
  'import': [schema: FormSchemaItem[]]
  'import-response': []
  'export': []
  'update:mode': [mode: 'edit' | 'preview']
  'copy': []
  'delete': []
  'move-up': []
  'move-down': []
  'align': [align: 'left' | 'center' | 'right']
  'undo': []
  'redo': []
  'group': [containerType: 'card' | 'page' | 'toolbar']
  'ungroup': []
  'validate': []
  'save-draft': []
  'publish': []
  'preview': []
  'toggle-thumbnail': []
  'canvas-size-change': [preset: string]
  'load-schema': [schema: FormSchemaItem[]]
}>()

// ---- Computed disabled states ----
const hasSelection = computed(() => props.selectedIndices.length > 0)
const selectionCount = computed(() => props.selectedIndices.length)
const isFirstItem = computed(() => props.selectedIndex === 0)
const isLastItem = computed(() => props.selectedIndex === props.schemaLength - 1)

/** Display title — shows schema name when editing an existing schema */
const displayTitle = computed(() => {
  if (props.schemaName) return props.schemaName
  return 'Schema 编辑器'
})

// ---- Tooltip helpers ----
function batchLabel(action: string): string {
  if (selectionCount.value > 1) {
    return `${action} (${selectionCount.value} selected)`
  }
  return action
}

// ---- Import / Export ----
const showImportDialog = ref(false)
const importJson = ref('')

function handleImport() {
  importJson.value = ''
  showImportDialog.value = true
}

function confirmImport() {
  try {
    const parsed = JSON.parse(importJson.value) as unknown
    if (!Array.isArray(parsed)) {
      ElMessage.error('JSON Schema must be an array')
      return
    }
    emit('import', parsed as FormSchemaItem[])
    showImportDialog.value = false
    ElMessage.success('Schema imported successfully')
  } catch {
    ElMessage.error('Invalid JSON format')
  }
}

function handleExport() {
  emit('export')
}

// ---- Save / Publish / Preview ----
function handleSaveDraft() {
  emit('save-draft')
}

function handlePublish() {
  emit('publish')
}

function handlePreview() {
  emit('preview')
}

function handleToggleThumbnail() {
  emit('toggle-thumbnail')
}

// ---- Canvas size presets ----
const canvasSizePresets = [
  { label: '1920x1080', value: '1920x1080' },
  { label: '1440x900', value: '1440x900' },
  { label: '1366x768', value: '1366x768' },
  { label: 'Custom', value: 'custom' },
]

function handleCanvasSizeChange(preset: string) {
  emit('canvas-size-change', preset)
}

// ---- Load from Server ----
const schemaStore = useSchemaStore()
const showLoadDialog = ref(false)
const loadSchemaList = ref<SchemaListItem[]>([])
const loadSchemaLoading = ref(false)

async function handleOpenLoadDialog() {
  showLoadDialog.value = true
  loadSchemaLoading.value = true
  const result = await schemaStore.fetchSchemas({ page: 1, pageSize: 100 })
  if (result) {
    loadSchemaList.value = result.items
  }
  loadSchemaLoading.value = false
}

async function handleLoadSchema(item: SchemaListItem) {
  const detail = await schemaStore.fetchSchemaById(item.id)
  if (detail) {
    if (!detail.json) { ElMessage.error('Schema data is empty'); return }
    const loaded = schemaStore.loadIntoEditor(detail.json)
    emit('load-schema', loaded)
    showLoadDialog.value = false
    ElMessage.success(`Schema "${item.name}" loaded`)
  }
}

// ---- Edit operations ----
function handleCopy() { if (!hasSelection.value) return; emit('copy') }
function handleDelete() { if (!hasSelection.value) return; emit('delete') }
function handleMoveUp() { if (!hasSelection.value || isFirstItem.value) return; emit('move-up') }
function handleMoveDown() { if (!hasSelection.value || isLastItem.value) return; emit('move-down') }
function handleAlign(align: 'left' | 'center' | 'right') {
  if (!hasSelection.value) return
  emit('align', align)
}
function handleUndo() { if (!props.canUndo) return; emit('undo') }
function handleRedo() { if (!props.canRedo) return; emit('redo') }
function handleGroup(type: 'card' | 'page' | 'toolbar') {
  if (!props.canGroup) return
  emit('group', type)
}
function handleUngroup() { if (!props.canUngroup) return; emit('ungroup') }

// ---- More dropdown handler ----
function handleMoreCommand(command: string) {
  switch (command) {
    case 'load': handleOpenLoadDialog(); break
    case 'import-json': handleImport(); break
    case 'import-response': emit('import-response'); break
    case 'export-json': handleExport(); break
  }
}

// ---- Keyboard shortcuts ----
function handleKeydown(event: KeyboardEvent) {
  const tag = (event.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'c') { event.preventDefault(); handleCopy() }
    if (event.key === 's') { event.preventDefault(); handleSaveDraft() }
    if (event.key === 'z') {
      event.preventDefault()
      event.shiftKey ? handleRedo() : handleUndo()
    }
    if (event.key === 'y') { event.preventDefault(); handleRedo() }
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    handleDelete()
  }
  if (event.key === 'ArrowUp' && event.altKey) { event.preventDefault(); handleMoveUp() }
  if (event.key === 'ArrowDown' && event.altKey) { event.preventDefault(); handleMoveDown() }
}

onMounted(() => { document.addEventListener('keydown', handleKeydown) })
onUnmounted(() => { document.removeEventListener('keydown', handleKeydown) })
</script>

<template>
  <div class="editor-toolbar">
    <!-- Brand: title + schema ID -->
    <div class="editor-toolbar__brand">
      <h2 class="editor-toolbar__title">{{ displayTitle }}</h2>
      <span v-if="schemaId" class="editor-toolbar__id-badge">{{ schemaId.slice(0, 8) }}</span>
    </div>

    <!-- Button groups evenly distributed across remaining width -->
    <div class="editor-toolbar__groups">
      <!-- Group 1: Undo / Redo -->
      <div v-if="mode === 'edit'" class="editor-toolbar__ops">
        <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
          <el-button :disabled="!canUndo" size="small" @click="handleUndo">
            <el-icon><RefreshLeft /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
          <el-button :disabled="!canRedo" size="small" @click="handleRedo">
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <!-- Group 2: Copy / Delete / Move Up / Move Down -->
      <div v-if="mode === 'edit'" class="editor-toolbar__ops">
        <el-tooltip :content="batchLabel('复制 (Ctrl+C)')" placement="bottom">
          <el-button :disabled="!hasSelection" size="small" @click="handleCopy">
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip :content="batchLabel('删除 (Del)')" placement="bottom">
          <el-button :disabled="!hasSelection" size="small" @click="handleDelete">
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="上移 (Alt+Up)" placement="bottom">
          <el-button :disabled="!hasSelection || isFirstItem" size="small" @click="handleMoveUp">
            <el-icon><Top /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="下移 (Alt+Down)" placement="bottom">
          <el-button :disabled="!hasSelection || isLastItem" size="small" @click="handleMoveDown">
            <el-icon><Bottom /></el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <!-- Group 3: Align Left / Center / Right -->
      <div v-if="mode === 'edit'" class="editor-toolbar__ops">
        <el-tooltip content="左对齐" placement="bottom">
          <el-button :disabled="!hasSelection" size="small" @click="handleAlign('left')">
            <svg class="editor-toolbar__align-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <rect x="1" y="2" width="14" height="2" rx="0.5"/>
              <rect x="1" y="7" width="10" height="2" rx="0.5"/>
              <rect x="1" y="12" width="12" height="2" rx="0.5"/>
            </svg>
          </el-button>
        </el-tooltip>
        <el-tooltip content="居中对齐" placement="bottom">
          <el-button :disabled="!hasSelection" size="small" @click="handleAlign('center')">
            <svg class="editor-toolbar__align-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <rect x="1" y="2" width="14" height="2" rx="0.5"/>
              <rect x="3" y="7" width="10" height="2" rx="0.5"/>
              <rect x="2" y="12" width="12" height="2" rx="0.5"/>
            </svg>
          </el-button>
        </el-tooltip>
        <el-tooltip content="右对齐" placement="bottom">
          <el-button :disabled="!hasSelection" size="small" @click="handleAlign('right')">
            <svg class="editor-toolbar__align-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <rect x="1" y="2" width="14" height="2" rx="0.5"/>
              <rect x="5" y="7" width="10" height="2" rx="0.5"/>
              <rect x="3" y="12" width="12" height="2" rx="0.5"/>
            </svg>
          </el-button>
        </el-tooltip>
      </div>

      <!-- Group 4: Group / Ungroup -->
      <div v-if="mode === 'edit'" class="editor-toolbar__ops">
        <el-dropdown :disabled="!canGroup" trigger="click" @command="handleGroup">
          <el-button :disabled="!canGroup" size="small">
            <el-icon><FolderAdd /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="card">Group as Card</el-dropdown-item>
              <el-dropdown-item command="page">Group as Page</el-dropdown-item>
              <el-dropdown-item command="toolbar">Group as Toolbar</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-tooltip content="取消分组" placement="bottom">
          <el-button :disabled="!canUngroup" size="small" @click="handleUngroup">
            <el-icon><FolderRemove /></el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <!-- Group 5: Validate -->
      <div v-if="mode === 'edit'" class="editor-toolbar__ops">
        <el-tooltip content="校验 Schema" placement="bottom">
          <el-button size="small" @click="emit('validate')">
            <el-icon>
              <Warning v-if="(validationErrorCount ?? 0) > 0" style="color: #e6a23c" />
              <CircleCheck v-else style="color: #67c23a" />
            </el-icon>
            <span v-if="(validationErrorCount ?? 0) > 0" class="editor-toolbar__badge editor-toolbar__badge--error">
              {{ validationErrorCount }}
            </span>
            <span v-if="(validationWarningCount ?? 0) > 0" class="editor-toolbar__badge editor-toolbar__badge--warning">
              {{ validationWarningCount }}
            </span>
          </el-button>
        </el-tooltip>
      </div>

      <!-- Group 6: Save Draft / Publish / Preview -->
      <div class="editor-toolbar__ops editor-toolbar__ops--actions">
        <el-tooltip content="保存草稿 (Ctrl+S)" placement="bottom">
          <el-button type="primary" size="small" @click="handleSaveDraft">
            保存草稿
          </el-button>
        </el-tooltip>
        <el-button type="success" size="small" @click="handlePublish">
          <el-icon><Promotion /></el-icon>
          发布
        </el-button>
        <el-button size="small" @click="handlePreview">
          <el-icon><View /></el-icon>
          预览
        </el-button>
      </div>

      <!-- Group 7: Canvas Size / Thumbnail -->
      <div class="editor-toolbar__ops">
        <el-dropdown trigger="click" @command="handleCanvasSizeChange">
          <el-button size="small">
            <el-icon><FullScreen /></el-icon>
            {{ canvasSizePreset ?? '1920x1080' }}
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="preset in canvasSizePresets"
                :key="preset.value"
                :command="preset.value"
              >
                {{ preset.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-tooltip content="切换缩略图" placement="bottom">
          <el-button
            size="small"
            :type="showThumbnail ? 'primary' : 'default'"
            @click="handleToggleThumbnail"
          >
            缩略图
          </el-button>
        </el-tooltip>
      </div>

      <!-- Group 8: More dropdown (Load / Import / Export) -->
      <div class="editor-toolbar__ops">
        <el-dropdown trigger="click" @command="handleMoreCommand">
          <el-tooltip content="更多操作" placement="bottom">
            <el-button size="small">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
          </el-tooltip>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="load">从服务器加载</el-dropdown-item>
              <el-dropdown-item command="import-json">导入 JSON</el-dropdown-item>
              <el-dropdown-item command="import-response">导入响应</el-dropdown-item>
              <el-dropdown-item command="export-json">导出 JSON</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- Load from Server Dialog -->
    <el-dialog v-model="showLoadDialog" title="从服务器加载 Schema" width="560px">
      <el-table
        :data="loadSchemaList"
        v-loading="loadSchemaLoading"
        highlight-current-row
        height="300"
        @row-click="handleLoadSchema"
      >
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
      </el-table>
      <p v-if="!loadSchemaLoading && loadSchemaList.length === 0"
        style="text-align:center; color:#909399; padding: 24px 0;">
        服务器上未找到 Schema
      </p>
    </el-dialog>

    <!-- Import Dialog -->
    <el-dialog v-model="showImportDialog" title="导入 JSON Schema" width="600px">
      <el-input
        v-model="importJson"
        type="textarea"
        :rows="16"
        placeholder="在此粘贴 FormSchemaItem[] JSON..."
      />
      <template #footer>
        <el-button @click="showImportDialog = false">Cancel</el-button>
        <el-button type="primary" @click="confirmImport">Import</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.editor-toolbar {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &__brand {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    min-width: 140px;
  }

  &__title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__id-badge {
    font-size: 11px;
    color: #909399;
    background: #f0f2f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    white-space: nowrap;
  }

  // Groups container: fills remaining space, distributes children evenly
  &__groups {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    gap: 4px;
  }

  // Each functional button cluster
  &__ops {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    padding: 4px 8px;
    background: #fafafa;
    border-radius: 6px;

    // Right-side clusters use a slightly different bg to visually separate
    &--actions {
      background: transparent;
      padding: 4px 2px;
    }
  }

  // Alignment icons: three horizontal lines at varying widths
  &__align-icon {
    display: block;
    opacity: 0.75;

    &:hover {
      opacity: 1;
    }
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    border-radius: 8px;
    margin-left: 4px;
    color: #fff;

    &--error {
      background: #f56c6c;
    }

    &--warning {
      background: #e6a23c;
    }
  }
}
</style>
