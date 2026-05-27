<script setup lang="ts">
/**
 * EditorToolbar — 顶部工具栏
 *
 * 布局：左侧(返回/名称/面板切换) | 中间(编辑操作按钮组) | 右侧(画布/预览/保存)
 * 保留新版设计风格，恢复旧版关键功能
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  RefreshLeft,
  RefreshRight,
  CopyDocument,
  Delete,
  Top,
  Bottom,
  FolderAdd,
  FolderRemove,
  CircleCheck,
  Warning,
  View,
  FullScreen,
  Promotion,
  Upload,
  Download,
  MoreFilled,
  EditPen,
  Lock,
  Monitor,
} from '@element-plus/icons-vue'
import type { PartialWidget } from '@/components/WidgetRenderer/types'
import type { SchemaListItem } from '@/types/api'
import type { InteractionMode } from '@/composables/useConstant'
import { useApiStore } from '@/stores/api'

const props = defineProps<{
  mode: InteractionMode
  schema: PartialWidget[]
  schemaName?: string
  schemaId?: string | null
  selectedIndex: number | null
  selectedIndices: number[]
  schemaLength: number
  canUndo: boolean
  canRedo: boolean
  canGroup: boolean
  canUngroup: boolean
  validationErrorCount?: number
  validationWarningCount?: number
  leftPanelVisible: boolean
  rightPanelVisible: boolean
  previewMode?: 'desktop' | 'tablet' | 'mobile'
  showThumbnail?: boolean
  canvasSizePreset?: string
  selectedZIndex?: number
}>()

const emit = defineEmits<{
  'update:schemaName': [name: string]
  'update:leftPanelVisible': [visible: boolean]
  'update:rightPanelVisible': [visible: boolean]
  'update:previewMode': [mode: 'desktop' | 'tablet' | 'mobile']
  'update:mode': [mode: InteractionMode]
  'save-draft': []
  'publish': []
  'preview': []
  'export': []
  'import': [schema: PartialWidget[]]
  'import-response': []
  'undo': []
  'redo': []
  'copy': []
  'delete': []
  'move-up': []
  'move-down': []
  'zindex-up': []
  'zindex-down': []
  'group': [containerType: 'card' | 'page' | 'toolbar']
  'ungroup': []
  'validate': []
  'toggle-thumbnail': []
  'canvas-size-change': [preset: string]
  'load-schema': [schema: PartialWidget[]]
}>()

// ---- Mode switcher ----
const modeLabels: Record<InteractionMode, string> = {
  'edit': '编辑',
  'preview': '预览',
  'publish-interactive': '发布(交互)',
  'publish-readonly': '发布(只读)',
}

const modeOptions: { value: InteractionMode; label: string; icon: typeof EditPen }[] = [
  { value: 'edit', label: '编辑模式', icon: EditPen },
  { value: 'preview', label: '预览模式', icon: View },
  { value: 'publish-interactive', label: '发布(交互)', icon: Monitor },
  { value: 'publish-readonly', label: '发布(只读)', icon: Lock },
]

// ---- Computed states ----
const hasSelection = computed(() => props.selectedIndices.length > 0)
const selectionCount = computed(() => props.selectedIndices.length)
const isFirstItem = computed(() => props.selectedIndex === 0)
const isLastItem = computed(() => props.selectedIndex === props.schemaLength - 1)

function batchLabel(action: string): string {
  return selectionCount.value > 1 ? `${action} (${selectionCount.value})` : action
}

// ---- Canvas size ----
const canvasSizePresets = [
  { label: '1920x1080', value: '1920x1080' },
  { label: '1440x900', value: '1440x900' },
  { label: '1366x768', value: '1366x768' },
]

// ---- Import ----
const showImportDialog = ref(false)
const importJson = ref('')

function handleImport() {
  importJson.value = ''
  showImportDialog.value = true
}

function confirmImport() {
  try {
    const parsed = JSON.parse(importJson.value) as unknown
    if (!Array.isArray(parsed)) { ElMessage.error('JSON 必须是数组'); return }
    emit('import', parsed as PartialWidget[])
    showImportDialog.value = false
    ElMessage.success('Schema 导入成功')
  } catch { ElMessage.error('JSON 格式错误') }
}

// ---- Load from server ----
const apiStore = useApiStore()
const showLoadDialog = ref(false)
const loadSchemaList = ref<SchemaListItem[]>([])
const loadSchemaLoading = ref(false)

async function handleOpenLoadDialog() {
  showLoadDialog.value = true
  loadSchemaLoading.value = true
  const result = await apiStore.fetchSchemas({ page: 1, pageSize: 100 })
  if (result) loadSchemaList.value = result.items
  loadSchemaLoading.value = false
}

async function handleLoadSchema(item: SchemaListItem) {
  const detail = await apiStore.fetchSchemaById(item.id)
  if (detail) {
    if (!detail.json) { ElMessage.error('Schema 数据为空'); return }
    emit('load-schema', detail.json)
    showLoadDialog.value = false
    ElMessage.success(`Schema "${item.name}" 已加载`)
  }
}

// ---- More dropdown ----
function handleMoreCommand(command: string) {
  switch (command) {
    case 'load': handleOpenLoadDialog(); break
    case 'import-json': handleImport(); break
    case 'import-response': emit('import-response'); break
    case 'export-json': emit('export'); break
    case 'zindex-up': handleZIndexUp(); break
    case 'zindex-down': handleZIndexDown(); break
  }
}

// ---- Edit operations ----
function handleCopy() { if (hasSelection.value) emit('copy') }
function handleDelete() { if (hasSelection.value) emit('delete') }
function handleMoveUp() { if (hasSelection.value && !isFirstItem.value) emit('move-up') }
function handleMoveDown() { if (hasSelection.value && !isLastItem.value) emit('move-down') }
function handleZIndexUp() { if (hasSelection.value) emit('zindex-up') }
function handleZIndexDown() { if (hasSelection.value) emit('zindex-down') }
function handleUndo() { if (props.canUndo) emit('undo') }
function handleRedo() { if (props.canRedo) emit('redo') }
function handleGroup(type: 'card' | 'page' | 'toolbar') { if (props.canGroup) emit('group', type) }
function handleUngroup() { if (props.canUngroup) emit('ungroup') }

// ---- Keyboard shortcuts ----
function handleKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (target?.closest('input, textarea, [contenteditable]')) return

  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'c') { event.preventDefault(); handleCopy() }
    if (event.key === 's') { event.preventDefault(); emit('save-draft') }
    if (event.key === 'z') { event.preventDefault(); event.shiftKey ? handleRedo() : handleUndo() }
    if (event.key === 'y') { event.preventDefault(); handleRedo() }
  }
  if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); handleDelete() }
  // Alt+Up/Down: z-index (bring forward / send backward)
  if (event.key === 'ArrowUp' && event.altKey) { event.preventDefault(); handleZIndexUp() }
  if (event.key === 'ArrowDown' && event.altKey) { event.preventDefault(); handleZIndexDown() }
  // Ctrl+Up/Down: array reorder (move up / move down)
  if (event.key === 'ArrowUp' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); handleMoveUp() }
  if (event.key === 'ArrowDown' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); handleMoveDown() }
}

onMounted(() => { document.addEventListener('keydown', handleKeydown) })
onUnmounted(() => { document.removeEventListener('keydown', handleKeydown) })
</script>

<template>
  <div class="editor-toolbar">
    <!-- 左侧：返回 / 名称 / 面板切换 -->
    <div class="editor-toolbar__left">
      <button class="editor-toolbar__icon-btn" title="返回">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 12L6 8l4-4"/>
        </svg>
      </button>
      <div class="editor-toolbar__divider" />
      <input
        :value="schemaName"
        class="editor-toolbar__name-input"
        placeholder="未命名实例"
        @input="emit('update:schemaName', ($event.target as HTMLInputElement).value)"
      />
      <div class="editor-toolbar__divider" />
      <button
        class="editor-toolbar__icon-btn"
        :class="{ 'editor-toolbar__icon-btn--active': leftPanelVisible }"
        title="部件面板"
        @click="emit('update:leftPanelVisible', !leftPanelVisible)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1.5" y="2" width="13" height="12" rx="1.5"/>
          <line x1="5.5" y1="2" x2="5.5" y2="14"/>
        </svg>
      </button>
      <button
        class="editor-toolbar__icon-btn"
        :class="{ 'editor-toolbar__icon-btn--active': rightPanelVisible }"
        title="属性面板"
        @click="emit('update:rightPanelVisible', !rightPanelVisible)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1.5" y="2" width="13" height="12" rx="1.5"/>
          <line x1="10.5" y1="2" x2="10.5" y2="14"/>
        </svg>
      </button>
    </div>

    <!-- 中间：编辑操作按钮组（仅编辑模式显示） -->
    <div v-if="mode === 'edit'" class="editor-toolbar__center">
      <div class="editor-toolbar__btn-group">
        <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!canUndo" @click="handleUndo">
            <el-icon :size="14"><RefreshLeft /></el-icon>
          </button>
        </el-tooltip>
        <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!canRedo" @click="handleRedo">
            <el-icon :size="14"><RefreshRight /></el-icon>
          </button>
        </el-tooltip>
      </div>

      <div class="editor-toolbar__btn-group">
        <el-tooltip :content="batchLabel('复制 (Ctrl+C)')" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection" @click="handleCopy">
            <el-icon :size="14"><CopyDocument /></el-icon>
          </button>
        </el-tooltip>
        <el-tooltip :content="batchLabel('删除 (Del)')" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection" @click="handleDelete">
            <el-icon :size="14"><Delete /></el-icon>
          </button>
        </el-tooltip>
        <el-tooltip content="上移 (Ctrl+Up)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection || isFirstItem" @click="handleMoveUp">
            <el-icon :size="14"><Top /></el-icon>
          </button>
        </el-tooltip>
        <el-tooltip content="下移 (Ctrl+Down)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection || isLastItem" @click="handleMoveDown">
            <el-icon :size="14"><Bottom /></el-icon>
          </button>
        </el-tooltip>
      </div>

      <div class="editor-toolbar__btn-group">
        <el-dropdown trigger="click" @command="handleMoreCommand">
          <button class="editor-toolbar__icon-btn" title="更多操作">
            <el-icon :size="14"><MoreFilled /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :disabled="!hasSelection" command="zindex-up">
                上移一层 (Alt+↑)
              </el-dropdown-item>
              <el-dropdown-item :disabled="!hasSelection" command="zindex-down">
                下移一层 (Alt+↓)
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div class="editor-toolbar__btn-group">
        <el-dropdown :disabled="!canGroup" trigger="click" @command="handleGroup">
          <button class="editor-toolbar__icon-btn" :disabled="!canGroup">
            <el-icon :size="14"><FolderAdd /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="card">分组为卡片</el-dropdown-item>
              <el-dropdown-item command="page">分组为页面</el-dropdown-item>
              <el-dropdown-item command="toolbar">分组为工具栏</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-tooltip content="取消分组" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!canUngroup" @click="handleUngroup">
            <el-icon :size="14"><FolderRemove /></el-icon>
          </button>
        </el-tooltip>
      </div>

      <div class="editor-toolbar__btn-group">
        <el-tooltip content="校验 Schema" placement="bottom">
          <button class="editor-toolbar__icon-btn" @click="emit('validate')">
            <el-icon :size="14">
              <Warning v-if="(validationErrorCount ?? 0) > 0" style="color: #e6a23c" />
              <CircleCheck v-else style="color: #67c23a" />
            </el-icon>
            <span v-if="(validationErrorCount ?? 0) > 0" class="editor-toolbar__badge editor-toolbar__badge--error">
              {{ validationErrorCount }}
            </span>
            <span v-if="(validationWarningCount ?? 0) > 0" class="editor-toolbar__badge editor-toolbar__badge--warning">
              {{ validationWarningCount }}
            </span>
          </button>
        </el-tooltip>
      </div>
    </div>

    <!-- 右侧：模式切换/画布/缩略图/导出/预览/保存/发布 -->
    <div class="editor-toolbar__right">
      <!-- 模式切换下拉 -->
      <el-dropdown trigger="click" @command="(m: InteractionMode) => emit('update:mode', m)">
        <button class="editor-toolbar__mode-indicator" :class="`editor-toolbar__mode-indicator--${mode}`">
          <el-icon :size="12">
            <EditPen v-if="mode === 'edit'" />
            <View v-else-if="mode === 'preview'" />
            <Monitor v-else-if="mode === 'publish-interactive'" />
            <Lock v-else />
          </el-icon>
          <span>{{ modeLabels[mode] }}</span>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6l4 4 4-4"/>
          </svg>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="m in modeOptions"
              :key="m.value"
              :command="m.value"
              :class="{ 'is-active': mode === m.value }"
            >
              <el-icon :size="14"><component :is="m.icon" /></el-icon>
              {{ m.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <div class="editor-toolbar__divider" />

      <!-- 画布尺寸 -->
      <el-dropdown trigger="click" @command="(v: string) => emit('canvas-size-change', v)">
        <button class="editor-toolbar__icon-btn" title="画布尺寸">
          <el-icon :size="14"><FullScreen /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="preset in canvasSizePresets"
              :key="preset.value"
              :command="preset.value"
              :class="{ 'is-active': canvasSizePreset === preset.value }"
            >
              {{ preset.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 缩略图开关 -->
      <el-tooltip content="缩略图" placement="bottom">
        <button
          class="editor-toolbar__icon-btn"
          :class="{ 'editor-toolbar__icon-btn--active': showThumbnail }"
          @click="emit('toggle-thumbnail')"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="1" width="14" height="14" rx="1.5"/>
            <rect x="3" y="3" width="4" height="3" rx="0.5"/>
            <path d="M3 12l3-4 2 2 3-4 4 6"/>
          </svg>
        </button>
      </el-tooltip>

      <!-- 更多 -->
      <el-dropdown trigger="click" @command="handleMoreCommand">
        <button class="editor-toolbar__icon-btn" title="更多">
          <el-icon :size="14"><MoreFilled /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="load">
              <el-icon><Download /></el-icon>从服务器加载
            </el-dropdown-item>
            <el-dropdown-item command="import-json">
              <el-icon><Upload /></el-icon>导入 JSON
            </el-dropdown-item>
            <el-dropdown-item command="import-response">导入响应</el-dropdown-item>
            <el-dropdown-item divided command="export-json">
              <el-icon><Download /></el-icon>导出 JSON
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <div class="editor-toolbar__divider" />

      <!-- 预览模式切换 -->
      <div class="editor-toolbar__mode-switcher">
        <button
          class="editor-toolbar__mode-btn"
          :class="{ 'editor-toolbar__mode-btn--active': previewMode === 'desktop' }"
          title="桌面"
          @click="emit('update:previewMode', 'desktop')"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="2" width="14" height="10" rx="1"/>
            <line x1="5" y1="14" x2="11" y2="14"/>
            <line x1="8" y1="12" x2="8" y2="14"/>
          </svg>
        </button>
        <button
          class="editor-toolbar__mode-btn"
          :class="{ 'editor-toolbar__mode-btn--active': previewMode === 'tablet' }"
          title="平板"
          @click="emit('update:previewMode', 'tablet')"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="1" width="12" height="14" rx="1.5"/>
            <circle cx="8" cy="12.5" r="0.8" fill="currentColor"/>
          </svg>
        </button>
        <button
          class="editor-toolbar__mode-btn"
          :class="{ 'editor-toolbar__mode-btn--active': previewMode === 'mobile' }"
          title="移动端"
          @click="emit('update:previewMode', 'mobile')"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="1" width="8" height="14" rx="1.5"/>
            <circle cx="8" cy="12.5" r="0.8" fill="currentColor"/>
          </svg>
        </button>
      </div>

      <div class="editor-toolbar__divider" />

      <!-- 预览 -->
      <button class="editor-toolbar__btn editor-toolbar__btn--outline" @click="emit('preview')">
        <el-icon :size="12"><View /></el-icon>
        <span>预览</span>
      </button>

      <!-- 发布 -->
      <button class="editor-toolbar__btn editor-toolbar__btn--success" @click="emit('publish')">
        <el-icon :size="12"><Promotion /></el-icon>
        <span>发布</span>
      </button>

      <!-- 保存 -->
      <button class="editor-toolbar__btn editor-toolbar__btn--primary" @click="emit('save-draft')">
        <span>保存</span>
      </button>
    </div>
  </div>

  <!-- 从服务器加载弹窗 -->
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

  <!-- 导入弹窗 -->
  <el-dialog v-model="showImportDialog" title="导入 JSON Schema" width="600px">
    <el-input
      v-model="importJson"
      type="textarea"
      :rows="16"
      placeholder="在此粘贴 PartialWidget[] JSON..."
    />
    <template #footer>
      <el-button @click="showImportDialog = false">取消</el-button>
      <el-button type="primary" @click="confirmImport">导入</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.editor-toolbar {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 8px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  gap: 4px;
  position: sticky;
  top: 0;
  z-index: 100;

  &__divider {
    width: 1px;
    height: 20px;
    background: var(--el-border-color-lighter);
    flex-shrink: 0;
    margin: 0 2px;
  }

  // ---- Left section ----
  &__left {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  &__name-input {
    width: 128px;
    padding: 4px 8px;
    border: 1px solid var(--el-border-color);
    font-size: var(--el-font-size-small);
    color: var(--el-text-color-primary);
    background: transparent;
    outline: none;
    transition: border-color 0.2s;
    flex-shrink: 0;

    &:focus { border-color: var(--el-color-primary); }
    &::placeholder { color: var(--el-text-color-placeholder); }
  }

  // ---- Center section (edit operations) ----
  &__center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 0;
  }

  &__btn-group {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 2px 3px;
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }

  // ---- Right section ----
  &__right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  // ---- Icon button ----
  &__icon-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--el-text-color-regular);
    cursor: pointer;
    border-radius: var(--el-border-radius-small);
    transition: all 0.15s;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      background: var(--el-fill-color-light);
      color: var(--el-text-color-primary);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    &--active {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);

      &:hover { background: var(--el-color-primary-light-8); }
    }
  }

  &__badge {
    position: absolute;
    top: -2px;
    right: -2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 14px;
    height: 14px;
    padding: 0 3px;
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
    border-radius: 7px;
    color: var(--el-color-white);

    &--error { background: var(--el-color-danger); }
    &--warning { background: var(--el-color-warning); }
  }

  // ---- Mode switcher ----
  &__mode-switcher {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    background: var(--el-fill-color-light);
    border-radius: var(--el-border-radius-small);
    flex-shrink: 0;
  }

  &__mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    border-radius: 3px;
    transition: all 0.15s;

    &:hover { color: var(--el-text-color-regular); }

    &--active {
      background: var(--el-bg-color);
      color: var(--el-color-primary);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }
  }

  // ---- Mode indicator ----
  &__mode-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: var(--el-font-size-small);
    font-weight: 500;
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-small);
    background: var(--el-bg-color);
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;

    &:hover { border-color: var(--el-border-color-hover); background: var(--el-fill-color-lighter); }

    &--edit { color: var(--el-color-primary); border-color: var(--el-color-primary-light-5); }
    &--preview { color: var(--el-color-warning); border-color: var(--el-color-warning-light-5); }
    &--publish-interactive { color: var(--el-color-success); border-color: var(--el-color-success-light-5); }
    &--publish-readonly { color: var(--el-text-color-secondary); border-color: var(--el-border-color); }
  }

  // ---- Text buttons ----
  &__btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    font-size: var(--el-font-size-small);
    border-radius: var(--el-border-radius-small);
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
    white-space: nowrap;

    &--outline {
      background: var(--el-bg-color);
      border: 1px solid var(--el-border-color);
      color: var(--el-text-color-regular);
      &:hover { border-color: var(--el-border-color-hover); background: var(--el-fill-color-lighter); }
    }

    &--success {
      background: var(--el-color-success);
      border: 1px solid var(--el-color-success);
      color: var(--el-color-white);
      &:hover { background: var(--el-color-success-light-3); border-color: var(--el-color-success-light-3); }
    }

    &--primary {
      background: var(--el-color-primary);
      border: 1px solid var(--el-color-primary);
      color: var(--el-color-white);
      &:hover { background: var(--el-color-primary-light-3); border-color: var(--el-color-primary-light-3); }
    }
  }
}
</style>
