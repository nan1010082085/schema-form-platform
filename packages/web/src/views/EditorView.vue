<script setup lang="ts">
/**
 * EditorView — 可视化 Schema 编辑器 (New Architecture)
 *
 * 三栏布局：左侧面板 + 中间画布 + 右侧属性面板
 * 使用 4 个新 Store：
 * - useBoardStore  — 画布配置
 * - useWidgetStore — Widget 数据（source of truth）
 * - useEditorStore — 选中、历史、模式
 * - useDragStore   — 拖拽状态
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useBoardStore } from '@/stores/board'
import { useWidgetStore } from '@/stores/widget'
import { useEditorStore } from '@/stores/editor'
import { registerAllWidgets } from '@/widgets'
import EditorCanvas from '@/components/Editor/EditorCanvas.vue'
import EditorLeftPanel from '@/components/Editor/EditorLeftPanel.vue'
import PropertyPanel from '@/components/Editor/PropertyPanel.vue'
import type { Widget } from '@/widgets/base/types'
import {
  CopyDocument,
  Delete,
  View,
  EditPen,
  FullScreen,
  Clock,
  Download,
  DArrowLeft,
  DArrowRight,
} from '@element-plus/icons-vue'
import { fetchVersions, fetchVersion } from '@/utils/apiClient'
import type { VersionEntry } from '@/types/api'

// Register all widgets on first mount
registerAllWidgets()

const route = useRoute()
const boardStore = useBoardStore()
const widgetStore = useWidgetStore()
const editorStore = useEditorStore()

// ================================================================
// Layout state
// ================================================================

const leftPanelVisible = ref(true)
const rightPanelVisible = ref(true)

// ================================================================
// Mode
// ================================================================

const mode = computed(() => editorStore.mode)

// ================================================================
// Canvas size presets
// ================================================================

const canvasSizePreset = ref('1920x1080')
const canvasSizePresets = [
  { label: '1920x1080', value: '1920x1080' },
  { label: '1440x900', value: '1440x900' },
  { label: '1366x768', value: '1366x768' },
]
const canvasSizeMap: Record<string, { w: number; h: number }> = {
  '1920x1080': { w: 1920, h: 1080 },
  '1440x900': { w: 1440, h: 900 },
  '1366x768': { w: 1366, h: 768 },
}

function handleCanvasSizeChange(preset: string) {
  canvasSizePreset.value = preset
  const size = canvasSizeMap[preset]
  if (size) boardStore.updateCanvas({ width: size.w, height: size.h })
}

// ================================================================
// Load schema from API
// ================================================================

onMounted(async () => {
  const id = route.query.id as string | undefined
  if (id) {
    // TODO: Load from API when backend is ready
    // const detail = await apiStore.fetchSchemaById(id)
    // if (detail) {
    //   boardStore.loadBoard({ id: detail.id, name: detail.name, status: detail.status })
    //   widgetStore.loadWidgets(detail.json)
    //   currentEditId.value = detail.editId
    //   currentVersion.value = detail.version
    // }
    console.log('[EditorView] Load schema:', id)
  }

  // Set default board name if empty
  if (!boardStore.name) {
    boardStore.name = '未命名画布'
  }
})

// 页面刷新/关闭拦截
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (editorStore.isDirty) {
    e.preventDefault()
    e.returnValue = ''
  }
}
window.addEventListener('beforeunload', handleBeforeUnload)
onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

// ================================================================
// Keyboard shortcuts
// ================================================================

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (editorStore.selectedId && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      handleDeleteWidget()
    }
  }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      handleUndo()
    }
    if (e.key === 'z' && e.shiftKey) {
      e.preventDefault()
      handleRedo()
    }
    if (e.key === 'c') {
      e.preventDefault()
      handleCopyWidget()
    }
    if (e.key === 'v') {
      e.preventDefault()
      handlePasteWidget()
    }
  }
}

// ================================================================
// Context menu dialog targets — 委托给 editorStore，PropertyPanel 监听并打开弹框
// ================================================================

function handleOpenEvent(widget: Widget) { editorStore.openConfigDialog(widget, 'events') }
function handleOpenRule(widget: Widget) { editorStore.openConfigDialog(widget, 'rules') }
function handleOpenApi(widget: Widget) { editorStore.openConfigDialog(widget, 'api') }

// ================================================================
// Toolbar actions
// ================================================================

function handleUndo() {
  const snapshot = editorStore.undo()
  if (snapshot) widgetStore.widgets = snapshot
}

function handleRedo() {
  const snapshot = editorStore.redo()
  if (snapshot) widgetStore.widgets = snapshot
}

function handleCopyWidget() {
  const widget = widgetStore.findWidget(editorStore.selectedId ?? '')
  if (widget) editorStore.copy(widget)
}

function handlePasteWidget() {
  const pasted = editorStore.paste()
  if (pasted) {
    pasted.position.x += 20
    pasted.position.y += 20
    widgetStore.addWidget(pasted)
    editorStore.pushHistory([...widgetStore.widgets])
  }
}

function handleDeleteWidget() {
  if (!editorStore.selectedId) return
  widgetStore.removeWidget(editorStore.selectedId)
  editorStore.clearSelection()
  editorStore.pushHistory([...widgetStore.widgets])
}

function handleCopyId() {
  if (!editorStore.selectedId) return
  navigator.clipboard.writeText(editorStore.selectedId)
  ElMessage.success('已复制部件 ID')
}

type AlignDir = 'top' | 'bottom' | 'left' | 'right' | 'center-h' | 'center-v'

function handleAlign(dir: AlignDir) {
  const id = editorStore.selectedId
  if (!id) return
  const widget = widgetStore.findWidget(id)
  if (!widget) return
  const p = { ...widget.position }

  switch (dir) {
    case 'top': p.y = 0; break
    case 'bottom': p.y = boardStore.canvas.height - p.h; break
    case 'left': p.x = 0; break
    case 'right': p.x = boardStore.canvas.width - p.w; break
    case 'center-h': p.x = Math.round((boardStore.canvas.width - p.w) / 2); break
    case 'center-v': p.y = Math.round((boardStore.canvas.height - p.h) / 2); break
  }

  widgetStore.updateWidget(id, { position: p })
  editorStore.pushHistory([...widgetStore.widgets])
}

// ================================================================
// Zoom controls
// ================================================================

function handleZoomIn() {
  boardStore.setZoom(boardStore.canvas.zoom + 10)
}

function handleZoomOut() {
  boardStore.setZoom(boardStore.canvas.zoom - 10)
}

// ================================================================
// Save (placeholder)
// ================================================================

async function handleSave() {
  const data = {
    name: boardStore.name,
    status: boardStore.status,
    canvas: boardStore.canvas,
    variables: boardStore.variables,
    events: boardStore.events,
    widgets: widgetStore.widgets,
  }
  console.log('[EditorView] Save:', JSON.stringify(data, null, 2))
  editorStore.markClean()
  ElMessage.success('已保存（控制台输出）')
}

// ================================================================
// Version management
// ================================================================

const currentEditId = ref('')
const currentVersion = ref('')
const versionPopoverVisible = ref(false)
const versionList = ref<VersionEntry[]>([])
const versionLoading = ref(false)

function formatVersion(v: string): string {
  if (!v || v.length !== 14) return v
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)} ${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}`
}

async function loadVersionList() {
  if (!currentEditId.value) return
  versionLoading.value = true
  try {
    const res = await fetchVersions(currentEditId.value)
    versionList.value = res.items
  } catch {
    versionList.value = []
  } finally {
    versionLoading.value = false
  }
}

async function handleLoadVersion(entry: VersionEntry) {
  if (!currentEditId.value) return
  try {
    const detail = await fetchVersion(currentEditId.value, entry.version)
    widgetStore.loadWidgets(detail.json as unknown as Widget[])
    currentVersion.value = entry.version
    editorStore.markClean()
    versionPopoverVisible.value = false
    ElMessage.success(`已加载版本 ${formatVersion(entry.version)}`)
  } catch {
    ElMessage.error('加载版本失败')
  }
}

// ================================================================
// Clear canvas
// ================================================================

function handleClearCanvas() {
  widgetStore.clearWidgets()
  editorStore.clearSelection()
  editorStore.pushHistory([])
}
</script>

<template>
  <div class="editor-view" @keydown="handleKeyDown">
    <!-- Top toolbar -->
    <div class="editor-view__toolbar">
      <!-- Left: name + panel toggles (edit mode only) -->
      <div v-if="mode === 'edit'" class="editor-view__toolbar-left">
        <input
          v-model="boardStore.name"
          class="editor-view__name-input"
          placeholder="未命名画布"
        />
        <span v-if="currentVersion" class="editor-view__version-badge">v{{ formatVersion(currentVersion) }}</span>
        <div class="editor-view__divider" />
        <button
          class="editor-view__icon-btn"
          :class="{ 'editor-view__icon-btn--active': leftPanelVisible }"
          title="部件面板"
          @click="leftPanelVisible = !leftPanelVisible"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1.5" y="2" width="13" height="12" rx="1.5"/>
            <line x1="5.5" y1="2" x2="5.5" y2="14"/>
          </svg>
        </button>
        <button
          class="editor-view__icon-btn"
          :class="{ 'editor-view__icon-btn--active': rightPanelVisible }"
          title="属性面板"
          @click="rightPanelVisible = !rightPanelVisible"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1.5" y="2" width="13" height="12" rx="1.5"/>
            <line x1="10.5" y1="2" x2="10.5" y2="14"/>
          </svg>
        </button>
      </div>

      <!-- Center: edit operations -->
      <div v-if="mode === 'edit'" class="editor-view__toolbar-center">
        <div class="editor-view__btn-group">
          <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
            <button class="editor-view__icon-btn" :disabled="!editorStore.canUndo" @click="handleUndo">
              <el-icon :size="14"><DArrowLeft /></el-icon>
            </button>
          </el-tooltip>
          <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
            <button class="editor-view__icon-btn" :disabled="!editorStore.canRedo" @click="handleRedo">
              <el-icon :size="14"><DArrowRight /></el-icon>
            </button>
          </el-tooltip>
        </div>
        <div class="editor-view__btn-group">
          <el-tooltip content="复制部件 (Ctrl+C)" placement="bottom">
            <button class="editor-view__icon-btn" :disabled="!editorStore.selectedId" @click="handleCopyWidget">
              <el-icon :size="14"><CopyDocument /></el-icon>
            </button>
          </el-tooltip>
          <el-tooltip content="删除部件 (Del)" placement="bottom">
            <button class="editor-view__icon-btn" :disabled="!editorStore.selectedId" @click="handleDeleteWidget">
              <el-icon :size="14"><Delete /></el-icon>
            </button>
          </el-tooltip>
        </div>
        <div class="editor-view__btn-group">
          <el-tooltip content="复制部件 ID" placement="bottom">
            <button class="editor-view__icon-btn" :disabled="!editorStore.selectedId" @click="handleCopyId">
              <el-icon :size="14"><CopyDocument /></el-icon>
            </button>
          </el-tooltip>
        </div>
        <div class="editor-view__btn-group">
          <el-dropdown trigger="click" :disabled="!editorStore.selectedId" @command="handleAlign">
            <button class="editor-view__icon-btn" :disabled="!editorStore.selectedId" title="对齐">
              <el-icon :size="14"><Download /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="top">顶部对齐</el-dropdown-item>
                <el-dropdown-item command="bottom">底部对齐</el-dropdown-item>
                <el-dropdown-item command="left">左对齐</el-dropdown-item>
                <el-dropdown-item command="right">右对齐</el-dropdown-item>
                <el-dropdown-item divided command="center-h">水平居中</el-dropdown-item>
                <el-dropdown-item command="center-v">垂直居中</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- Right: zoom, mode, save -->
      <div class="editor-view__toolbar-right">
        <!-- Canvas size (edit only) -->
        <el-dropdown v-if="mode === 'edit'" trigger="click" @command="handleCanvasSizeChange">
          <button class="editor-view__icon-btn" title="画布尺寸">
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

        <div class="editor-view__divider" />

        <!-- Zoom -->
        <div class="editor-view__zoom-group">
          <button class="editor-view__icon-btn" :disabled="boardStore.canvas.zoom <= 50" @click="handleZoomOut">-</button>
          <span class="editor-view__zoom-value">{{ boardStore.canvas.zoom }}%</span>
          <button class="editor-view__icon-btn" :disabled="boardStore.canvas.zoom >= 200" @click="handleZoomIn">+</button>
        </div>

        <div class="editor-view__divider" />

        <!-- Mode switch -->
        <div class="editor-view__mode-switcher">
          <button
            class="editor-view__mode-btn"
            :class="{ 'editor-view__mode-btn--active': mode === 'edit' }"
            title="编辑模式"
            @click="editorStore.setMode('edit')"
          >
            <el-icon :size="12"><EditPen /></el-icon>
          </button>
          <button
            class="editor-view__mode-btn"
            :class="{ 'editor-view__mode-btn--active': mode === 'preview' }"
            title="预览模式"
            @click="editorStore.setMode('preview')"
          >
            <el-icon :size="12"><View /></el-icon>
          </button>
        </div>

        <template v-if="mode === 'edit'">
          <div class="editor-view__divider" />

          <!-- Version history -->
          <el-popover
            v-model:visible="versionPopoverVisible"
            placement="bottom-end"
            :width="320"
            trigger="click"
            @show="loadVersionList"
          >
            <template #reference>
              <button class="editor-view__icon-btn" title="版本历史" @click="versionPopoverVisible = !versionPopoverVisible">
                <el-icon :size="14"><Clock /></el-icon>
              </button>
            </template>
            <div class="editor-view__version-panel">
              <div class="editor-view__version-header">
                <span class="editor-view__version-title">版本历史</span>
              </div>
              <div v-if="versionLoading" class="editor-view__version-loading">加载中...</div>
              <div v-else-if="versionList.length === 0" class="editor-view__version-empty">暂无版本记录</div>
              <div v-else class="editor-view__version-list">
                <div
                  v-for="entry in versionList"
                  :key="entry.version"
                  class="editor-view__version-item"
                  :class="{ 'editor-view__version-item--current': entry.version === currentVersion }"
                >
                  <div class="editor-view__version-info">
                    <span class="editor-view__version-time">{{ formatVersion(entry.version) }}</span>
                    <div class="editor-view__version-tags">
                      <el-tag v-if="entry.published" type="success" size="small">已发布</el-tag>
                      <el-tag v-if="entry.version === currentVersion" type="primary" size="small">当前</el-tag>
                    </div>
                  </div>
                  <el-button
                    v-if="entry.version !== currentVersion"
                    size="small"
                    text
                    type="primary"
                    @click="handleLoadVersion(entry)"
                  >加载</el-button>
                </div>
              </div>
            </div>
          </el-popover>

          <button class="editor-view__btn editor-view__btn--outline" @click="handleClearCanvas">清空</button>
          <button class="editor-view__btn editor-view__btn--primary" @click="handleSave">保存</button>
        </template>
      </div>
    </div>

    <!-- Body: left panel + canvas + right panel -->
    <div class="editor-view__body">
      <!-- Left panel -->
      <div v-if="leftPanelVisible && mode === 'edit'" class="editor-view__left">
        <EditorLeftPanel
          :schema-status="boardStore.status"
          :schema-type="'form'"
          :schema-id="boardStore.id || null"
        />
      </div>

      <!-- Center: canvas -->
      <div class="editor-view__center">
        <EditorCanvas
          @open-event="handleOpenEvent"
          @open-rule="handleOpenRule"
          @open-api="handleOpenApi"
        />
      </div>

      <!-- Right panel -->
      <div v-if="rightPanelVisible && mode === 'edit'" class="editor-view__right">
        <PropertyPanel />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--el-fill-color-light);

  &__toolbar {
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 8px;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;
    gap: 4px;
    z-index: 100;
  }

  &__toolbar-left,
  &__toolbar-center,
  &__toolbar-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__toolbar-left { flex-shrink: 0; }
  &__toolbar-center { flex: 1; justify-content: center; gap: 2px; }
  &__toolbar-right { flex-shrink: 0; }

  &__divider {
    width: 1px;
    height: 20px;
    background: var(--el-border-color-lighter);
    flex-shrink: 0;
    margin: 0 2px;
  }

  &__name-input {
    width: 140px;
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

  &__btn-group {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 2px 3px;
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }

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

  &__zoom-group {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 2px 3px;
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }

  &__zoom-value {
    font-size: var(--el-font-size-small);
    color: var(--el-text-color-regular);
    min-width: 40px;
    text-align: center;
    user-select: none;
  }

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

    &--primary {
      background: var(--el-color-primary);
      border: 1px solid var(--el-color-primary);
      color: var(--el-color-white);
      &:hover { background: var(--el-color-primary-light-3); border-color: var(--el-color-primary-light-3); }
    }
  }

  &__version-badge {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__version-panel {
    max-height: 320px;
    overflow-y: auto;
  }

  &__version-header {
    padding-bottom: 8px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    margin-bottom: 8px;
  }

  &__version-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__version-loading,
  &__version-empty {
    padding: 16px 0;
    text-align: center;
    font-size: 13px;
    color: var(--el-text-color-placeholder);
  }

  &__version-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__version-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border-radius: var(--el-border-radius-small);
    transition: background 0.15s;

    &:hover { background: var(--el-fill-color-light); }

    &--current {
      background: var(--el-color-primary-light-9);
    }
  }

  &__version-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__version-time {
    font-size: 12px;
    color: var(--el-text-color-regular);
    font-family: monospace;
  }

  &__version-tags {
    display: flex;
    gap: 4px;
  }

  &__body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__left {
    width: 260px;
    flex-shrink: 0;
    background: var(--el-bg-color);
    border-right: 1px solid var(--el-border-color-lighter);
    overflow: hidden;
  }

  &__left-tabs {
    height: 100%;

    :deep(.el-tabs__content) {
      padding: 0;
      height: calc(100% - 40px);
      overflow: auto;
    }

    :deep(.el-tab-pane) {
      height: 100%;
    }
  }

  &__center {
    flex: 1;
    min-width: 0;
    overflow: auto;
    background: var(--el-fill-color-light);
    padding: 24px;
  }

  &__right {
    width: 300px;
    flex-shrink: 0;
    background: var(--el-bg-color);
    border-left: 1px solid var(--el-border-color-lighter);
    overflow: hidden;
  }
}
</style>
