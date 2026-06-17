<script setup lang="ts">
/**
 * EditorToolbar — 顶部工具栏
 *
 * 布局：左侧(返回/名称/面板切换) | 中间(编辑操作按钮组) | 右侧(画布/预览/保存)
 * 保留新版设计风格，恢复旧版关键功能
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { PartialWidget } from '@/components/WidgetRenderer/types'
import type { SchemaListItem } from '@/types/api'
import type { InteractionMode } from '@/composables/useConstant'
import { useApiStore } from '@/stores/api'
import { getAppUrl } from '@schema-form/shared-qiankun/config'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

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

const modeOptions: { value: InteractionMode; label: string; icon: string }[] = [
  { value: 'edit', label: '编辑模式', icon: 'edit' },
  { value: 'preview', label: '预览模式', icon: 'view' },
  { value: 'publish-interactive', label: '发布(交互)', icon: 'monitor' },
  { value: 'publish-readonly', label: '发布(只读)', icon: 'lock' },
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
    const json = Array.isArray(detail.json) ? detail.json : (detail.json as any).widgets ?? []
    emit('load-schema', json)
    showLoadDialog.value = false
    ElMessage.success(`Schema "${item.name}" 已加载`)
  }
}

// ---- More dropdown ----
function handleMoreCommand(command: string | number | object) {
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
function handleGroup(command: string | number | object) { if (props.canGroup) emit('group', command as 'card') }
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
  const base = getAppUrl('editor', import.meta.env.DEV)
  window.location.href = `${base}instances`
}

onMounted(() => { document.addEventListener('keydown', handleKeydown) })
onUnmounted(() => { document.removeEventListener('keydown', handleKeydown) })
</script>

<template>
  <div class="editor-toolbar">
    <!-- 左侧：返回 / 名称 / 面板切换 -->
    <div class="editor-toolbar__left">
      <el-tooltip content="返回列表" placement="bottom">
        <button class="editor-toolbar__icon-btn" title="返回列表" @click="goToPortal">
          <AppIcon name="back" :size="14" />
        </button>
      </el-tooltip>
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
        <AppIcon name="grid" :size="16" />
      </button>
      <button
        class="editor-toolbar__icon-btn"
        :class="{ 'editor-toolbar__icon-btn--active': rightPanelVisible }"
        title="属性面板"
        @click="emit('update:rightPanelVisible', !rightPanelVisible)"
      >
        <AppIcon name="setting" :size="16" />
      </button>
    </div>

    <!-- 中间：编辑操作按钮组（仅编辑模式显示） -->
    <div v-if="mode === 'edit'" class="editor-toolbar__center">
      <div class="editor-toolbar__btn-group">
        <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!canUndo" @click="handleUndo">
            <AppIcon name="refresh-left" />
          </button>
        </el-tooltip>
        <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!canRedo" @click="handleRedo">
            <AppIcon name="refresh-right" />
          </button>
        </el-tooltip>
      </div>
      <div class="editor-toolbar__btn-group">
        <el-tooltip :content="batchLabel('复制 (Ctrl+C)')" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection" @click="handleCopy">
            <AppIcon name="copy-document" />
          </button>
        </el-tooltip>
        <el-tooltip :content="batchLabel('删除 (Del)')" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection" @click="handleDelete">
            <AppIcon name="delete" />
          </button>
        </el-tooltip>
        <el-tooltip content="上移 (Ctrl+Up)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection || isFirstItem" @click="handleMoveUp">
            <AppIcon name="arrow-up" />
          </button>
        </el-tooltip>
        <el-tooltip content="下移 (Ctrl+Down)" placement="bottom">
          <button class="editor-toolbar__icon-btn" :disabled="!hasSelection || isLastItem" @click="handleMoveDown">
            <AppIcon name="arrow-down" />
          </button>
        </el-tooltip>
      </div>
      <div class="editor-toolbar__btn-group">
        <el-dropdown trigger="click" @command="handleMoreCommand">
          <button class="editor-toolbar__icon-btn" title="更多操作">
            <AppIcon name="more-filled" />
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
            <AppIcon name="folder-add" />
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
            <AppIcon name="folder-remove" />
          </button>
        </el-tooltip>
      </div>
      <div class="editor-toolbar__btn-group">
        <el-tooltip content="校验 Schema" placement="bottom">
          <button class="editor-toolbar__icon-btn" @click="emit('validate')">
            <AppIcon v-if="(validationErrorCount ?? 0) > 0" name="circle-close-filled" style="color: #e6a23c" />
            <AppIcon v-else name="circle-check-filled" style="color: #67c23a" />
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
      <el-dropdown trigger="click" @command="(m: any) => emit('update:mode', m)">
        <button class="editor-toolbar__mode-indicator" :class="`editor-toolbar__mode-indicator--${mode}`">
          <AppIcon v-if="mode === 'edit'" name="lock" />
          <AppIcon v-else-if="mode === 'preview'" name="monitor" />
          <AppIcon v-else-if="mode === 'publish-interactive'" name="video-play" />
          <AppIcon v-else name="lock" />
          <span>{{ modeLabels[mode] }}</span>
          <AppIcon name="arrow-down" :size="10" />
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="m in modeOptions"
              :key="m.value"
              :command="m.value"
              :class="{ 'is-active': mode === m.value }"
            >
              <AppIcon :name="m.icon" />
              {{ m.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <div class="editor-toolbar__divider" />

      <!-- 画布尺寸 -->
      <el-dropdown trigger="click" @command="(v: any) => emit('canvas-size-change', v)">
        <button class="editor-toolbar__icon-btn" title="画布尺寸">
          <AppIcon name="full-screen" />
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
          <AppIcon name="picture" :size="14" />
        </button>
      </el-tooltip>

      <!-- 更多 -->
      <el-dropdown trigger="click" @command="handleMoreCommand">
        <button class="editor-toolbar__icon-btn" title="更多">
          <AppIcon name="more-filled" />
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="load">
              <AppIcon name="folder" />从服务器加载
            </el-dropdown-item>
            <el-dropdown-item command="import-json">
              <AppIcon name="upload" />导入 JSON
            </el-dropdown-item>
            <el-dropdown-item command="import-response">导入响应</el-dropdown-item>
            <el-dropdown-item divided command="export-json">
              <AppIcon name="download" />导出 JSON
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
          <AppIcon name="monitor" :size="14" />
        </button>
        <button
          class="editor-toolbar__mode-btn"
          :class="{ 'editor-toolbar__mode-btn--active': previewMode === 'tablet' }"
          title="平板"
          @click="emit('update:previewMode', 'tablet')"
        >
          <AppIcon name="iphone" :size="14" />
        </button>
        <button
          class="editor-toolbar__mode-btn"
          :class="{ 'editor-toolbar__mode-btn--active': previewMode === 'mobile' }"
          title="移动端"
          @click="emit('update:previewMode', 'mobile')"
        >
          <AppIcon name="cellphone" :size="14" />
        </button>
      </div>

      <div class="editor-toolbar__divider" />

      <!-- 预览 -->
      <button class="editor-toolbar__btn editor-toolbar__btn--outline" @click="emit('preview')">
        <AppIcon name="view" />
        <span>预览</span>
      </button>

      <!-- 发布 -->
      <button class="editor-toolbar__btn editor-toolbar__btn--success" @click="emit('publish')">
        <AppIcon name="promotion" />
        <span>发布</span>
      </button>

      <!-- 保存 -->
      <button class="editor-toolbar__btn editor-toolbar__btn--primary" @click="emit('save-draft')">
        <span>保存</span>
      </button>
    </div>
  </div>

  <!-- 从服务器加载弹窗 -->
  <el-dialog v-model="showLoadDialog" title="从服务器加载 Schema" width="560px" :append-to-body="true">
    <div v-loading="loadSchemaLoading">
      <el-table
        :data="loadSchemaList"
        height="300"
        @row-click="handleLoadSchema"
      >
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
      </el-table>
    </div>
    <p v-if="!loadSchemaLoading && loadSchemaList.length === 0"
      style="text-align:center; color:#909399; padding: 24px 0;">
      服务器上未找到 Schema
    </p>
  </el-dialog>

  <!-- 导入弹窗 -->
  <el-dialog v-model="showImportDialog" title="导入 JSON Schema" width="600px" :append-to-body="true">
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
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color-light);
  flex-shrink: 0;
  gap: 4px;
  position: sticky;
  top: 0;
  z-index: 100;

  &__divider {
    width: 1px;
    height: 20px;
    background: var(--border-color-light);
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
    color: var(--text-color-secondary);
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__name-input {
    width: 128px;
    padding: 4px 8px;
    border: 1px solid var(--border-color-light);
    font-size: 13px;
    color: var(--text-color-primary);
    background: var(--bg-color-secondary);
    outline: none;
    transition: border-color 0.2s;
    flex-shrink: 0;
    border-radius: 4px;

    &:focus { border-color: var(--color-primary); }
    &::placeholder { color: var(--text-color-placeholder); }
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
    background: var(--bg-color-secondary);
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
    color: var(--text-color-secondary);
    cursor: pointer;
    border-radius: var(--radius-small);
    transition: all 0.2s;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      background: var(--color-primary-lighter);
      color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }

    &--active {
      color: var(--color-primary);
      background: var(--color-primary-lighter);

      &:hover { background: var(--color-primary-lighter); }
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

    &--error { background: var(--el-color-danger); }
    &--warning { background: var(--el-color-warning); }
  }

  // ---- Mode switcher ----
  &__mode-switcher {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    background: var(--bg-color-gray);
    border-radius: var(--el-border-radius-small);
    flex-shrink: 0;
    border: 1px solid var(--color-primary-lighter);
  }

  &__mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--text-color-placeholder);
    cursor: pointer;
    border-radius: 3px;
    transition: all 0.15s;

    &:hover { color: var(--text-color-secondary); }

    &--active {
      background: var(--color-primary-bg-light);
      color: var(--color-primary);
      box-shadow: 0 0 8px var(--color-primary-lighter);
    }
  }

  // ---- Mode indicator ----
  &__mode-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: var(--el-font-size-base);
    font-weight: 500;
    border: 1px solid var(--color-primary-lighter);
    border-radius: 6px;
    background: var(--bg-color-gray);
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;

    &:hover { border-color: var(--color-primary-light); background: var(--color-primary-lighter); }

    &--edit { color: var(--color-primary); border-color: var(--color-primary-light); }
    &--preview { color: #ffab40; border-color: rgba(255, 171, 64, 0.2); }
    &--publish-interactive { color: #00e676; border-color: rgba(0, 230, 118, 0.2); }
    &--publish-readonly { color: var(--text-color-placeholder); border-color: var(--color-primary-lighter); }
  }

  // ---- Text buttons ----
  &__btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    font-size: var(--el-font-size-base);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
    white-space: nowrap;

    &--outline {
      background: var(--bg-color-gray);
      border: 1px solid var(--color-primary-lighter);
      color: var(--text-color-regular);
      &:hover { border-color: var(--color-primary-light); background: var(--color-primary-lighter); color: var(--text-color-primary); }
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
      background: var(--color-primary);
      border: 1px solid var(--color-primary);
      color: #000;
      font-weight: 600;
      box-shadow: 0 0 10px var(--color-primary-light);
      &:hover { background: var(--color-primary); border-color: var(--color-primary); box-shadow: 0 0 15px var(--color-primary-light); }
    }
  }
}
</style>
