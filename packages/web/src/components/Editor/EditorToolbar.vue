<script setup lang="ts">
/**
 * EditorToolbar — 编辑器顶部工具栏 (Phase 3)
 *
 * 功能分组：
 * 1. 左侧：标题 + 编辑操作（撤销/重做 复制/删除/上移/下移/对齐/分组 校验）
 * 2. 右侧：保存草稿/发布/预览 | 加载/导入/导出 | 画布尺寸/缩略图/模式切换
 *
 * Phase 3 新增:
 * - 保存草稿 / 发布 / 预览 按钮
 * - 缩略图切换
 * - 画布尺寸选择器
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  CopyDocument,
  Delete,
  Top,
  Bottom,
  Upload,
  Download,
  Document,
  RefreshLeft,
  RefreshRight,
  FolderAdd,
  FolderRemove,
  CircleCheck,
  Warning,
  View,
  FullScreen,
  Promotion,
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
  /** Phase 3: Schema name for display */
  schemaName?: string
  /** Phase 3: Current schema ID (null when new) */
  schemaId?: string | null
  /** Phase 3: Thumbnail toggle state */
  showThumbnail?: boolean
  /** Phase 3: Current canvas size preset */
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
  /** Phase 3: Save as draft */
  'save-draft': []
  /** Phase 3: Publish */
  'publish': []
  /** Phase 3: Preview */
  'preview': []
  /** Phase 3: Toggle thumbnail */
  'toggle-thumbnail': []
  /** Phase 3: Canvas size changed */
  'canvas-size-change': [preset: string]
  /** Emitted when user loads a schema from server */
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
  return 'Schema Editor'
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

// ---- Phase 3: Save / Publish / Preview ----
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
  { label: '1920×1080', value: '1920×1080' },
  { label: '1440×900', value: '1440×900' },
  { label: '1366×768', value: '1366×768' },
  { label: 'Custom', value: 'custom' },
]

function handleCanvasSizeChange(preset: string) {
  emit('canvas-size-change', preset)
}

// ---- Load from Server (Phase 3: moved to dropdown) ----
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

// ---- Mode toggle ----
function toggleMode() {
  const newMode = props.mode === 'edit' ? 'preview' : 'edit'
  emit('update:mode', newMode)
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
    <div class="editor-toolbar__left">
      <h2 class="editor-toolbar__title">{{ displayTitle }}</h2>
      <span v-if="schemaId" class="editor-toolbar__id-badge">{{ schemaId.slice(0, 8) }}</span>

      <!-- Undo/Redo group -->
      <div v-if="mode === 'edit'" class="editor-toolbar__ops">
        <el-tooltip content="Undo (Ctrl+Z)" placement="bottom">
          <el-button :disabled="!canUndo" size="small" @click="handleUndo">
            <el-icon><RefreshLeft /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="Redo (Ctrl+Shift+Z)" placement="bottom">
          <el-button :disabled="!canRedo" size="small" @click="handleRedo">
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </el-tooltip>
        <el-divider direction="vertical" />
      </div>

      <!-- Edit operations group -->
      <div v-if="mode === 'edit'" class="editor-toolbar__ops">
        <el-tooltip :content="batchLabel('Copy (Ctrl+C)')" placement="bottom">
          <el-button :disabled="!hasSelection" size="small" @click="handleCopy">
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip :content="batchLabel('Delete (Del)')" placement="bottom">
          <el-button :disabled="!hasSelection" size="small" @click="handleDelete">
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>
        <el-divider direction="vertical" />
        <el-tooltip content="Move Up (Alt+Up)" placement="bottom">
          <el-button :disabled="!hasSelection || isFirstItem" size="small" @click="handleMoveUp">
            <el-icon><Top /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="Move Down (Alt+Down)" placement="bottom">
          <el-button :disabled="!hasSelection || isLastItem" size="small" @click="handleMoveDown">
            <el-icon><Bottom /></el-icon>
          </el-button>
        </el-tooltip>
        <el-divider direction="vertical" />
        <el-tooltip content="Align Left" placement="bottom">
          <el-button :disabled="!hasSelection" size="small" @click="handleAlign('left')">
            <span class="editor-toolbar__align-icon">L</span>
          </el-button>
        </el-tooltip>
        <el-tooltip content="Align Center" placement="bottom">
          <el-button :disabled="!hasSelection" size="small" @click="handleAlign('center')">
            <span class="editor-toolbar__align-icon">C</span>
          </el-button>
        </el-tooltip>
        <el-tooltip content="Align Right" placement="bottom">
          <el-button :disabled="!hasSelection" size="small" @click="handleAlign('right')">
            <span class="editor-toolbar__align-icon">R</span>
          </el-button>
        </el-tooltip>
        <el-divider direction="vertical" />
        <el-dropdown :disabled="!canGroup" trigger="click" @command="handleGroup">
          <el-tooltip :content="batchLabel('Group as Container')" placement="bottom">
            <el-button :disabled="!canGroup" size="small">
              <el-icon><FolderAdd /></el-icon>
            </el-button>
          </el-tooltip>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="card">Group as Card</el-dropdown-item>
              <el-dropdown-item command="page">Group as Page</el-dropdown-item>
              <el-dropdown-item command="toolbar">Group as Toolbar</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-tooltip content="Ungroup Container" placement="bottom">
          <el-button :disabled="!canUngroup" size="small" @click="handleUngroup">
            <el-icon><FolderRemove /></el-icon>
          </el-button>
        </el-tooltip>
        <el-divider direction="vertical" />
        <el-tooltip content="Validate Schema" placement="bottom">
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
    </div>

    <!-- Phase 3: Right side with save/publish/preview + utilities -->
    <div class="editor-toolbar__right">
      <!-- Save / Publish / Preview group -->
      <div class="editor-toolbar__ops">
        <el-button type="primary" size="small" @click="handleSaveDraft">
          保存草稿
        </el-button>
        <el-button type="success" size="small" @click="handlePublish">
          <el-icon><Promotion /></el-icon>
          发布
        </el-button>
        <el-button size="small" @click="handlePreview">
          <el-icon><View /></el-icon>
          预览
        </el-button>
        <el-divider direction="vertical" />
      </div>

      <!-- Canvas tools -->
      <div class="editor-toolbar__ops">
        <el-dropdown trigger="click" @command="handleCanvasSizeChange">
          <el-button size="small">
            <el-icon><FullScreen /></el-icon>
            {{ canvasSizePreset ?? '1920×1080' }}
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
        <el-tooltip content="Toggle Thumbnail" placement="bottom">
          <el-button
            size="small"
            :type="showThumbnail ? 'primary' : 'default'"
            @click="handleToggleThumbnail"
          >
            缩略图
          </el-button>
        </el-tooltip>
        <el-divider direction="vertical" />
      </div>

      <!-- Import / Export / Load -->
      <div class="editor-toolbar__ops">
        <el-button size="small" @click="handleOpenLoadDialog">
          加载
        </el-button>
        <el-button size="small" @click="handleImport">
          <el-icon><Upload /></el-icon>
          导入JSON
        </el-button>
        <el-button size="small" @click="emit('import-response')">
          <el-icon><Document /></el-icon>
          导入响应
        </el-button>
        <el-button size="small" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出JSON
        </el-button>
        <el-divider direction="vertical" />
      </div>

      <!-- Mode toggle -->
      <el-button :type="mode === 'preview' ? 'success' : 'info'" size="small" @click="toggleMode">
        {{ mode === 'edit' ? '预览' : '编辑' }}
      </el-button>
    </div>

    <!-- Load from Server Dialog -->
    <el-dialog v-model="showLoadDialog" title="Load Schema from Server" width="560px">
      <el-table
        :data="loadSchemaList"
        v-loading="loadSchemaLoading"
        highlight-current-row
        height="300"
        @row-click="handleLoadSchema"
      >
        <el-table-column prop="name" label="Name" />
        <el-table-column prop="updatedAt" label="Updated" width="180" />
      </el-table>
      <p v-if="!loadSchemaLoading && loadSchemaList.length === 0"
        style="text-align:center; color:#909399; padding: 24px 0;">
        No schemas found on server
      </p>
    </el-dialog>

    <!-- Import Dialog -->
    <el-dialog v-model="showImportDialog" title="Import JSON Schema" width="600px">
      <el-input
        v-model="importJson"
        type="textarea"
        :rows="16"
        placeholder="Paste your FormSchemaItem[] JSON here..."
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
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
  gap: 8px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &__left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
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

  &__ops {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    padding: 4px 8px;
    background: #fafafa;
    border-radius: 6px;

    .el-divider--vertical {
      margin: 0 4px;
    }
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  &__align-icon {
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
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
