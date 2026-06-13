<script setup lang="ts">
/**
 * EditorToolbar — 顶部工具栏
 *
 * 布局：左侧(返回/名称/面板切换) | 中间(编辑操作按钮组) | 右侧(画布/预览/保存)
 * 保留新版设计风格，恢复旧版关键功能
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  RollbackIcon,
  RefreshIcon,
  CopyIcon,
  DeleteIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FolderAddIcon,
  FolderMinusIcon,
  CheckCircleFilledIcon,
  ErrorCircleFilledIcon,
  BrowseIcon,
  FullscreenIcon,
  SendIcon,
  UploadIcon,
  DownloadIcon,
  MoreIcon,
  EditIcon,
  LockIcon,
  DesktopIcon,
  HomeIcon,
} from 'tdesign-icons-vue-next'
import type { PartialWidget } from '@/components/WidgetRenderer/types'
import type { SchemaListItem } from '@/types/api'
import type { InteractionMode } from '@/composables/useConstant'
import { useApiStore } from '@/stores/api'
import { getAppUrl } from '@schema-form/shared-qiankun/config'

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
  'group': [containerType: 'card']
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

const modeOptions: { value: InteractionMode; label: string; icon: any }[] = [
  { value: 'edit', label: '编辑模式', icon: EditIcon },
  { value: 'preview', label: '预览模式', icon: BrowseIcon },
  { value: 'publish-interactive', label: '发布(交互)', icon: DesktopIcon },
  { value: 'publish-readonly', label: '发布(只读)', icon: LockIcon },
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
    if (!Array.isArray(parsed)) { MessagePlugin.error('JSON 必须是数组'); return }
    emit('import', parsed as PartialWidget[])
    showImportDialog.value = false
    MessagePlugin.success('Schema 导入成功')
  } catch { MessagePlugin.error('JSON 格式错误') }
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
    if (!detail.json) { MessagePlugin.error('Schema 数据为空'); return }
    emit('load-schema', detail.json)
    showLoadDialog.value = false
    MessagePlugin.success(`Schema "${item.name}" 已加载`)
  }
}

// ---- More dropdown ----
function handleMoreCommand(opt: { value: string | number }) {
  switch (opt.value) {
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
function handleGroup(opt: { value: string | number }) { if (props.canGroup) emit('group', opt.value as 'card') }
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

function goToPortal() {
  window.location.href = getAppUrl('shell', import.meta.env.DEV)
}

onMounted(() => { document.addEventListener('keydown', handleKeydown) })
onUnmounted(() => { document.removeEventListener('keydown', handleKeydown) })
</script>

<template>
  <div class="editor-toolbar">
    <!-- 左侧：返回 / 名称 / 面板切换 -->
    <div class="editor-toolbar__left">
      <t-popup content="返回门户首页" placement="bottom">
        <button class="editor-toolbar__icon-btn" title="返回门户" @click="goToPortal">
          <HomeIcon />
        </button>
      </t-popup>
      <div class="editor-toolbar__divider" />
      <span class="editor-toolbar__app-name">表单编辑器</span>
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
        <t-popup content="撤销 (Ctrl+Z)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!canUndo" @click="handleUndo">
            <RollbackIcon />
          </button>
        </t-popup>
        <t-popup content="重做 (Ctrl+Y)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!canRedo" @click="handleRedo">
            <RefreshIcon />
          </button>
        </t-popup>
      </div>

      <div class="editor-toolbar__btn-group">
        <t-popup :content="batchLabel('复制 (Ctrl+C)')" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection" @click="handleCopy">
            <CopyIcon />
          </button>
        </t-popup>
        <t-popup :content="batchLabel('删除 (Del)')" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection" @click="handleDelete">
            <DeleteIcon />
          </button>
        </t-popup>
        <t-popup content="上移 (Ctrl+Up)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection || isFirstItem" @click="handleMoveUp">
            <ChevronUpIcon />
          </button>
        </t-popup>
        <t-popup content="下移 (Ctrl+Down)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection || isLastItem" @click="handleMoveDown">
            <ChevronDownIcon />
          </button>
        </t-popup>
      </div>

      <div class="editor-toolbar__btn-group">
        <t-dropdown trigger="click" @click="handleMoreCommand">
          <button class="editor-toolbar__icon-btn" title="更多操作">
            <MoreIcon />
          </button>
          <t-dropdown-menu>
            <t-dropdown-item :disabled="!hasSelection" value="zindex-up">
              上移一层 (Alt+↑)
            </t-dropdown-item>
            <t-dropdown-item :disabled="!hasSelection" value="zindex-down">
              下移一层 (Alt+↓)
            </t-dropdown-item>
          </t-dropdown-menu>
        </t-dropdown>
      </div>

      <div class="editor-toolbar__btn-group">
        <t-dropdown :disabled="!canGroup" trigger="click" @click="handleGroup">
          <button class="editor-toolbar__icon-btn" :disabled="!canGroup">
            <FolderAddIcon />
          </button>
          <t-dropdown-menu>
            <t-dropdown-item value="card">分组为卡片</t-dropdown-item>
            <t-dropdown-item value="page">分组为页面</t-dropdown-item>
            <t-dropdown-item value="toolbar">分组为工具栏</t-dropdown-item>
          </t-dropdown-menu>
        </t-dropdown>
        <t-popup content="取消分组" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!canUngroup" @click="handleUngroup">
            <FolderMinusIcon />
          </button>
        </t-popup>
      </div>

      <div class="editor-toolbar__btn-group">
        <t-popup content="校验 Schema" placement="bottom">
          <button class="editor-toolbar__icon-btn" @click="emit('validate')">
            <ErrorCircleFilledIcon v-if="(validationErrorCount ?? 0) > 0" style="color: #e6a23c" />
            <CheckCircleFilledIcon v-else style="color: #67c23a" />
            <span v-if="(validationErrorCount ?? 0) > 0" class="editor-toolbar__badge editor-toolbar__badge--error">
              {{ validationErrorCount }}
            </span>
            <span v-if="(validationWarningCount ?? 0) > 0" class="editor-toolbar__badge editor-toolbar__badge--warning">
              {{ validationWarningCount }}
            </span>
          </button>
        </t-popup>
      </div>
    </div>

    <!-- 右侧：模式切换/画布/缩略图/导出/预览/保存/发布 -->
    <div class="editor-toolbar__right">
      <!-- 模式切换下拉 -->
      <t-dropdown trigger="click" @click="(m: any) => emit('update:mode', m.value)">
        <button class="editor-toolbar__mode-indicator" :class="`editor-toolbar__mode-indicator--${mode}`">
          <EditIcon v-if="mode === 'edit'" />
          <BrowseIcon v-else-if="mode === 'preview'" />
          <DesktopIcon v-else-if="mode === 'publish-interactive'" />
          <LockIcon v-else />
          <span>{{ modeLabels[mode] }}</span>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6l4 4 4-4"/>
          </svg>
        </button>
        <t-dropdown-menu>
          <t-dropdown-item
            v-for="m in modeOptions"
            :key="m.value"
            :value="m.value"
            :class="{ 'is-active': mode === m.value }"
          >
            <component :is="m.icon" />
            {{ m.label }}
          </t-dropdown-item>
        </t-dropdown-menu>
      </t-dropdown>

      <div class="editor-toolbar__divider" />

      <!-- 画布尺寸 -->
      <t-dropdown trigger="click" @click="(v: any) => emit('canvas-size-change', v.value)">
        <button class="editor-toolbar__icon-btn" title="画布尺寸">
          <FullscreenIcon />
        </button>
        <t-dropdown-menu>
          <t-dropdown-item
            v-for="preset in canvasSizePresets"
            :key="preset.value"
            :value="preset.value"
            :class="{ 'is-active': canvasSizePreset === preset.value }"
          >
            {{ preset.label }}
          </t-dropdown-item>
        </t-dropdown-menu>
      </t-dropdown>

      <!-- 缩略图开关 -->
      <t-popup content="缩略图" placement="bottom">
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
      </t-popup>

      <!-- 更多 -->
      <t-dropdown trigger="click" @click="handleMoreCommand">
        <button class="editor-toolbar__icon-btn" title="更多">
          <MoreIcon />
        </button>
        <t-dropdown-menu>
          <t-dropdown-item value="load">
            <DownloadIcon />从服务器加载
          </t-dropdown-item>
          <t-dropdown-item value="import-json">
            <UploadIcon />导入 JSON
          </t-dropdown-item>
          <t-dropdown-item value="import-response">导入响应</t-dropdown-item>
          <t-dropdown-item divider value="export-json">
            <DownloadIcon />导出 JSON
          </t-dropdown-item>
        </t-dropdown-menu>
      </t-dropdown>

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
        <BrowseIcon />
        <span>预览</span>
      </button>

      <!-- 发布 -->
      <button class="editor-toolbar__btn editor-toolbar__btn--success" @click="emit('publish')">
        <SendIcon />
        <span>发布</span>
      </button>

      <!-- 保存 -->
      <button class="editor-toolbar__btn editor-toolbar__btn--primary" @click="emit('save-draft')">
        <span>保存</span>
      </button>
    </div>
  </div>

  <!-- 从服务器加载弹窗 -->
  <t-dialog v-model:visible="showLoadDialog" header="从服务器加载 Schema" width="560px">
    <t-loading :loading="loadSchemaLoading">
      <t-table
        :data="loadSchemaList"
        height="300"
        @row-click="handleLoadSchema"
      >
        <t-table-column col-key="name" title="名称" />
        <t-table-column col-key="updatedAt" title="更新时间" width="180" />
      </t-table>
    </t-loading>
    <p v-if="!loadSchemaLoading && loadSchemaList.length === 0"
      style="text-align:center; color:#909399; padding: 24px 0;">
      服务器上未找到 Schema
    </p>
  </t-dialog>

  <!-- 导入弹窗 -->
  <t-dialog v-model:visible="showImportDialog" header="导入 JSON Schema" width="600px">
    <t-textarea
      v-model="importJson"
      :rows="16"
      placeholder="在此粘贴 PartialWidget[] JSON..."
    />
    <template #footer>
      <t-button @click="showImportDialog = false">取消</t-button>
      <t-button theme="primary" @click="confirmImport">导入</t-button>
    </template>
  </t-dialog>
</template>

<style scoped lang="scss">
.editor-toolbar {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 8px;
  background: var(--glass-bg, rgba(17, 24, 32, 0.8));
  backdrop-filter: var(--glass-blur, blur(20px));
  -webkit-backdrop-filter: var(--glass-blur, blur(20px));
  border-bottom: 1px solid var(--glass-border, rgba(0, 212, 255, 0.1));
  flex-shrink: 0;
  gap: 4px;
  position: sticky;
  top: 0;
  z-index: 100;

  &__divider {
    width: 1px;
    height: 20px;
    background: rgba(0, 212, 255, 0.08);
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

  &__app-name {
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.35);
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__name-input {
    width: 128px;
    padding: 4px 8px;
    border: 1px solid rgba(0, 212, 255, 0.1);
    font-size: var(--td-font-size-body-small);
    color: rgba(255, 255, 255, 0.9);
    background: rgba(0, 0, 0, 0.2);
    outline: none;
    transition: border-color 0.2s;
    flex-shrink: 0;
    border-radius: 4px;

    &:focus { border-color: #00d4ff; box-shadow: 0 0 8px rgba(0, 212, 255, 0.2); }
    &::placeholder { color: rgba(255, 255, 255, 0.3); }
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
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    border: 1px solid rgba(0, 212, 255, 0.05);
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
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    border-radius: var(--td-radius-small);
    transition: all 0.15s;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      background: rgba(0, 212, 255, 0.08);
      color: rgba(255, 255, 255, 0.95);
    }

    &:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }

    &--active {
      color: #00d4ff;
      background: rgba(0, 212, 255, 0.1);

      &:hover { background: rgba(0, 212, 255, 0.15); }
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
    color: #fff;

    &--error { background: var(--td-error-color); }
    &--warning { background: var(--td-warning-color); }
  }

  // ---- Mode switcher ----
  &__mode-switcher {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--td-radius-small);
    flex-shrink: 0;
    border: 1px solid rgba(0, 212, 255, 0.05);
  }

  &__mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 24px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    border-radius: 3px;
    transition: all 0.15s;

    &:hover { color: rgba(255, 255, 255, 0.55); }

    &--active {
      background: rgba(0, 212, 255, 0.1);
      color: #00d4ff;
      box-shadow: 0 0 8px rgba(0, 212, 255, 0.15);
    }
  }

  // ---- Mode indicator ----
  &__mode-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: var(--td-font-size-body-small);
    font-weight: 500;
    border: 1px solid rgba(0, 212, 255, 0.12);
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;

    &:hover { border-color: rgba(0, 212, 255, 0.3); background: rgba(0, 212, 255, 0.06); }

    &--edit { color: #00d4ff; border-color: rgba(0, 212, 255, 0.2); }
    &--preview { color: #ffab40; border-color: rgba(255, 171, 64, 0.2); }
    &--publish-interactive { color: #00e676; border-color: rgba(0, 230, 118, 0.2); }
    &--publish-readonly { color: rgba(255, 255, 255, 0.35); border-color: rgba(0, 212, 255, 0.08); }
  }

  // ---- Text buttons ----
  &__btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    font-size: var(--td-font-size-body-small);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
    white-space: nowrap;

    &--outline {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(0, 212, 255, 0.12);
      color: rgba(255, 255, 255, 0.65);
      &:hover { border-color: rgba(0, 212, 255, 0.3); background: rgba(0, 212, 255, 0.06); color: rgba(255, 255, 255, 0.9); }
    }

    &--success {
      background: #00e676;
      border: 1px solid #00e676;
      color: #000;
      font-weight: 600;
      box-shadow: 0 0 8px rgba(0, 230, 118, 0.25);
      &:hover { background: #33eb91; border-color: #33eb91; box-shadow: 0 0 12px rgba(0, 230, 118, 0.35); }
    }

    &--primary {
      background: #00d4ff;
      border: 1px solid #00d4ff;
      color: #000;
      font-weight: 600;
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
      &:hover { background: #33ddff; border-color: #33ddff; box-shadow: 0 0 15px rgba(0, 212, 255, 0.4); }
    }
  }
}
</style>
