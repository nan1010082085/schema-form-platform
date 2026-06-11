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
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { connect as connectSocket, onAiApply, onAiPublished } from '@schema-form/socket'
import type { AiApplyEvent, AiPublishedEvent } from '@schema-form/socket'
import { useSnapshot } from '@/composables/useSnapshot'
import { useAutoSave } from '@/composables/useAutoSave'
import { useBoardStore } from '@/stores/board'
import { useWidgetStore } from '@/stores/widget'
import { useEditorStore } from '@/stores/editor'
import { useApiStore } from '@/stores/api'
import { registerAllWidgets } from '@/widgets'
import EditorCanvas from '@/components/Editor/EditorCanvas.vue'
import EditorLeftPanel from '@/components/Editor/EditorLeftPanel.vue'
import PropertyPanel from '@/components/Editor/PropertyPanel.vue'
import EventLogPanel from '@/components/Editor/EventLogPanel.vue'
import { setLogCollector } from '@/composables/useLogger'
import { useEventLog } from '@/composables/useEventLog'
import type { Widget } from '@/widgets/base/types'
import {
  CopyDocument,
  Delete,
  EditPen,
  FullScreen,
  Clock,
  Document,
  View,
  Refresh,
} from '@element-plus/icons-vue'
import { fetchVersions, fetchVersion } from '@/utils/apiClient'
import type { VersionEntry } from '@/types/api'
import SchemaVersionCompare from '@/components/SchemaVersionCompare.vue'
import { useSchemaVersionStore } from '@/stores/schemaVersion'

// Register all widgets on first mount
registerAllWidgets()

const route = useRoute()
const router = useRouter()
const boardStore = useBoardStore()
const widgetStore = useWidgetStore()
const editorStore = useEditorStore()
const apiStore = useApiStore()
const schemaVersionStore = useSchemaVersionStore()
const { captureElement } = useSnapshot()
const editorCanvasRef = ref<InstanceType<typeof EditorCanvas>>()

// 自动保存：脏数据 60 秒后自动触发保存
const { isAutoSaving } = useAutoSave({
  delayMs: 60_000,
  enabled: true,
  onSave: handleSave,
})

// ================================================================
// Layout state
// ================================================================

const leftPanelVisible = ref(true)
const rightPanelVisible = ref(true)
const showLogPanel = ref(false)
const showCodePanel = ref(false)
const showAiDrawer = ref(false)
const showVersionCompare = ref(false)
const aiBaseUrl = import.meta.env.VITE_AI_URL || '/ai/index-sidebar.html'

const aiDrawerData = computed(() => ({
  source: 'editor',
  currentSchema: widgetStore.widgets,
  version: currentVersion.value || undefined,
}))

function handleAiDataChange(data: Record<string, unknown>) {
  const { type, payload } = data as { type: string; payload: unknown }
  if (type === 'ai:published' && payload) {
    ElMessage.success('AI 已发布 Schema')
  }
  if (type === 'ai:open-in-editor' && payload) {
    const { schema } = payload as { schema: unknown[] | null }
    if (schema && Array.isArray(schema)) {
      widgetStore.loadWidgets(schema as Widget[])
      ElMessage.success('已加载 AI 生成的 Schema')
    }
  }
}

// ================================================================
// Mode
// ================================================================

const mode = computed(() => editorStore.mode)

/** Store 完整数据快照（供 code 面板展示） */
const storeSnapshot = computed(() => {
  const data = {
    board: {
      id: boardStore.id,
      name: boardStore.name,
      status: boardStore.status,
      canvas: boardStore.canvas,
    },
    widgets: widgetStore.widgets,
    editor: {
      mode: editorStore.mode,
      selectedId: editorStore.selectedId,
      isDirty: editorStore.isDirty,
    },
  }
  return JSON.stringify(data, null, 2)
})

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
  // 接入事件日志收集器
  const { push } = useEventLog()
  setLogCollector(push)

  const id = route.query.id as string | undefined
  const editId = route.query.editId as string | undefined
  const version = route.query.version as string | undefined

  if (editId && version) {
    // 加载特定版本
    const detail = await fetchVersion(editId, version)
    if (detail) {
      boardStore.loadBoard({
        id: detail.id,
        name: detail.name,
        status: (detail.status as 'draft' | 'published') || 'draft',
      })
      widgetStore.loadWidgets(detail.json as Widget[])
      currentEditId.value = editId
      currentVersion.value = version
    }
  } else if (id) {
    const detail = await apiStore.fetchSchemaById(id)
    if (detail) {
      boardStore.loadBoard({
        id: detail.id,
        name: detail.name,
        status: (detail.status as 'draft' | 'published') || 'draft',
      })
      widgetStore.loadWidgets(detail.json as Widget[])
      currentEditId.value = detail.editId
      currentVersion.value = detail.version
    }
  }

  // Set default board name if empty
  if (!boardStore.name) {
    boardStore.name = '未命名画布'
  }

  // 支持通过 mode 参数直接进入预览模式
  const mode = route.query.mode as string | undefined
  if (mode === 'preview') {
    editorStore.setMode('preview')
  }

  // Socket: 监听 AI 推送事件
  connectSocket()
  onAiApply((data: AiApplyEvent) => {
    if (data.type === 'schema' && Array.isArray(data.payload)) {
      widgetStore.loadWidgets(data.payload as unknown as Widget[])
      ElMessage.success('已应用 AI 生成的 Schema')
    }
  })
  onAiPublished((data: AiPublishedEvent) => {
    if (data.type === 'schema') {
      ElMessage.success('AI 已发布 Schema')
    }
  })
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

function isEditing(e: KeyboardEvent): boolean {
  return !!(e.target as HTMLElement)?.closest('input, textarea, [contenteditable]')
}

function handleKeyDown(e: KeyboardEvent) {
  if (editorStore.mode !== 'edit') return
  if (isEditing(e)) return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (editorStore.selectedId) {
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
    if (e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }
}

// ================================================================
// Context menu dialog targets — 委托给 editorStore，PropertyPanel 监听并打开弹框
// ================================================================

function handleOpenEvent(widget: Widget) { editorStore.openConfigDialog(widget, 'events') }
function handleOpenRule(widget: Widget) { editorStore.openConfigDialog(widget, 'rules') }
function handleOpenApi(widget: Widget) { editorStore.openConfigDialog(widget, 'api') }
function handleOpenVariables(widget: Widget) { editorStore.openConfigDialog(widget, 'variables') }

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
// Save
// ================================================================

const saving = ref(false)
const publishing = ref(false)
const COOLDOWN_MS = 2000

// 同步互斥锁，防止快速点击穿透 Vue 响应式批量更新
let _savingLock = false
let _publishingLock = false

async function handleSave() {
  if (_savingLock) return
  _savingLock = true
  saving.value = true
  try {
    const canvasEl = editorCanvasRef.value?.canvasRef
    let thumbnail = ''
    if (canvasEl) {
      thumbnail = await captureElement(canvasEl)
    }

    const result = await apiStore.saveSchema(
      widgetStore.widgets,
      boardStore.name,
      boardStore.id || undefined,
      thumbnail,
    )

    if (result) {
      boardStore.id = result.id
      currentEditId.value = result.editId
      currentVersion.value = result.version
      editorStore.markClean()
      ElMessage.success('已保存')
    } else {
      ElMessage.error(apiStore.error || '保存失败')
    }
  } finally {
    setTimeout(() => {
      _savingLock = false
      saving.value = false
    }, COOLDOWN_MS)
  }
}

async function handlePublish() {
  if (!boardStore.id || _publishingLock) return

  try {
    await ElMessageBox.confirm(
      '确认发布当前版本？',
      '发布确认',
      { type: 'info', confirmButtonText: '发布', cancelButtonText: '取消' },
    )
  } catch { return }

  _publishingLock = true
  publishing.value = true
  try {
    await handleSave()
    if (!boardStore.id) return

    const result = await apiStore.publishSchema(boardStore.id)
    if (result) {
      boardStore.status = 'published'
      ElMessage.success('发布成功')
    } else {
      ElMessage.error(apiStore.error || '发布失败')
    }
  } finally {
    setTimeout(() => {
      _publishingLock = false
      publishing.value = false
    }, COOLDOWN_MS)
  }
}

async function handleSavePreview(dataUrl: string) {
  if (!boardStore.id) {
    ElMessage.warning('请先保存画布')
    return
  }
  const result = await apiStore.updateSchema(boardStore.id, { thumbnail: dataUrl })
  if (result) {
    ElMessage.success('预览图已保存')
  }
}

// ================================================================
// Version management
// ================================================================

const currentEditId = ref('')
const currentVersion = ref('')
const versionPopoverVisible = ref(false)
const versionList = ref<VersionEntry[]>([])
const versionLoading = ref(false)
const versionPage = ref(1)
const versionTotal = ref(0)
const versionPageSize = 10

function formatVersion(v: string): string {
  if (!v || v.length !== 14) return v
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)} ${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}`
}

async function loadVersionList(page = 1) {
  if (!currentEditId.value) return
  versionLoading.value = true
  versionPage.value = page
  try {
    const res = await fetchVersions(currentEditId.value, page, versionPageSize)
    versionList.value = res.items
    versionTotal.value = res.total ?? 0
  } catch {
    versionList.value = []
  } finally {
    versionLoading.value = false
  }
}

function handleVersionPageChange(page: number) {
  loadVersionList(page)
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

async function handleOpenVersionCompare() {
  if (!currentEditId.value) {
    ElMessage.warning('请先保存 Schema 后才能查看版本历史')
    return
  }
  await schemaVersionStore.init(currentEditId.value, currentVersion.value)
  showVersionCompare.value = true
}

function handleVersionLoaded(version: string) {
  currentVersion.value = version
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
    <div :class="['editor-view__toolbar', { 'editor-view__toolbar--preview': mode === 'preview' }]">
      <!-- Left: back + name -->
      <div class="editor-view__toolbar-left">
        <button class="editor-view__icon-btn" title="返回" @click="router.push('/')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div class="editor-view__divider" />
        <template v-if="mode === 'edit'">
          <input
            v-model="boardStore.name"
            class="editor-view__name-input"
            placeholder="未命名画布"
          />
          <span v-if="currentVersion" class="editor-view__version-badge">v{{ formatVersion(currentVersion) }}</span>
          <span v-if="isAutoSaving" class="editor-view__auto-save-badge">自动保存中...</span>
          <span v-else-if="editorStore.isDirty" class="editor-view__dirty-badge">未保存</span>
        </template>
      </div>

      <!-- Center: panel toggles + operations + AI -->
      <div v-if="mode === 'edit'" class="editor-view__toolbar-center">
        <el-tooltip :content="leftPanelVisible ? '隐藏部件面板' : '显示部件面板'" placement="bottom">
          <button
            class="editor-view__icon-btn"
            :class="{ 'editor-view__icon-btn--active': leftPanelVisible }"
            title="部件面板"
            @click="leftPanelVisible = !leftPanelVisible"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="2" width="14" height="12" rx="1" />
              <line x1="5" y1="2" x2="5" y2="14" />
            </svg>
          </button>
        </el-tooltip>
        <div class="editor-view__btn-group">
          <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
            <button class="editor-view__icon-btn" :disabled="!editorStore.canUndo" @click="handleUndo">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 3 2 7 6 11" />
                <path d="M2 7h8a4 4 0 0 1 0 8H7" />
              </svg>
            </button>
          </el-tooltip>
          <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
            <button class="editor-view__icon-btn" :disabled="!editorStore.canRedo" @click="handleRedo">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="10 3 14 7 10 11" />
                <path d="M14 7H6a4 4 0 0 0 0 8h3" />
              </svg>
            </button>
          </el-tooltip>
        </div>
        <el-tooltip :content="rightPanelVisible ? '隐藏属性面板' : '显示属性面板'" placement="bottom">
          <button
            class="editor-view__icon-btn"
            :class="{ 'editor-view__icon-btn--active': rightPanelVisible }"
            title="属性面板"
            @click="rightPanelVisible = !rightPanelVisible"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="2" width="14" height="12" rx="1" />
              <line x1="11" y1="2" x2="11" y2="14" />
            </svg>
          </button>
        </el-tooltip>
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
        <div class="editor-view__divider" />
        <el-tooltip content="AI 助手" placement="bottom">
          <button
            class="editor-view__icon-btn editor-view__ai-btn"
            :class="{ 'editor-view__icon-btn--active': showAiDrawer }"
            @click="showAiDrawer = !showAiDrawer"
          >
            <span class="editor-view__ai-label">AI</span>
          </button>
        </el-tooltip>
        <div class="editor-view__divider" />
        <!-- 快捷键帮助 -->
        <el-popover placement="bottom" :width="320" trigger="click">
          <template #reference>
            <button class="editor-view__icon-btn" title="快捷键帮助">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M5.5 6.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
                <circle cx="8" cy="12" r="0.5" fill="currentColor" />
              </svg>
            </button>
          </template>
          <div class="editor-view__shortcuts">
            <div class="editor-view__shortcuts-title">快捷键</div>
            <div class="editor-view__shortcut-row">
              <span class="editor-view__shortcut-label">撤销</span>
              <span class="editor-view__shortcut-keys"><kbd>Ctrl</kbd> + <kbd>Z</kbd></span>
            </div>
            <div class="editor-view__shortcut-row">
              <span class="editor-view__shortcut-label">重做</span>
              <span class="editor-view__shortcut-keys"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></span>
            </div>
            <div class="editor-view__shortcut-row">
              <span class="editor-view__shortcut-label">复制部件</span>
              <span class="editor-view__shortcut-keys"><kbd>Ctrl</kbd> + <kbd>C</kbd></span>
            </div>
            <div class="editor-view__shortcut-row">
              <span class="editor-view__shortcut-label">粘贴部件</span>
              <span class="editor-view__shortcut-keys"><kbd>Ctrl</kbd> + <kbd>V</kbd></span>
            </div>
            <div class="editor-view__shortcut-row">
              <span class="editor-view__shortcut-label">删除部件</span>
              <span class="editor-view__shortcut-keys"><kbd>Delete</kbd></span>
            </div>
            <div class="editor-view__shortcut-row">
              <span class="editor-view__shortcut-label">保存</span>
              <span class="editor-view__shortcut-keys"><kbd>Ctrl</kbd> + <kbd>S</kbd></span>
            </div>
          </div>
        </el-popover>
        <div class="editor-view__divider" />
        <el-tooltip content="预览" placement="bottom">
          <button
            class="editor-view__icon-btn"
            title="预览"
            @click="editorStore.setMode('preview')"
          >
            <el-icon :size="14"><View /></el-icon>
          </button>
        </el-tooltip>
      </div>

      <!-- Center: preview mode -->
      <div v-if="mode === 'preview'" class="editor-view__toolbar-center">
        <span class="editor-view__preview-label">预览模式</span>
      </div>

      <!-- Right: version + save + publish -->
      <div class="editor-view__toolbar-right">
        <template v-if="mode === 'edit'">
          <!-- Canvas size -->
          <el-dropdown trigger="click" @command="handleCanvasSizeChange">
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
          <!-- Version history -->
          <el-popover
            v-model:visible="versionPopoverVisible"
            placement="bottom-end"
            :width="320"
            trigger="click"
            @show="loadVersionList"
          >
            <template #reference>
              <button class="editor-view__icon-btn" title="版本历史">
                <el-icon :size="14"><Clock /></el-icon>
              </button>
            </template>
            <div class="editor-view__version-panel">
              <div class="editor-view__version-header">
                <span class="editor-view__version-title">版本历史</span>
                <el-button size="small" text @click="loadVersionList(versionPage)">
                  <el-icon><Refresh /></el-icon>
                </el-button>
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
              <div v-if="versionTotal > versionPageSize" class="editor-view__version-pagination">
                <el-pagination
                  v-model:current-page="versionPage"
                  :page-size="versionPageSize"
                  :total="versionTotal"
                  layout="prev, pager, next"
                  small
                  @current-change="handleVersionPageChange"
                />
              </div>
            </div>
          </el-popover>
          <!-- Version compare -->
          <el-tooltip content="版本对比" placement="bottom">
            <button
              class="editor-view__icon-btn"
              :disabled="!currentEditId"
              title="版本对比"
              @click="handleOpenVersionCompare"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="2" width="5" height="12" rx="1" />
                <rect x="10" y="2" width="5" height="12" rx="1" />
                <line x1="6" y1="8" x2="10" y2="8" />
                <polyline points="7.5 6 6 8 7.5 10" />
                <polyline points="8.5 6 10 8 8.5 10" />
              </svg>
            </button>
          </el-tooltip>
          <button class="editor-view__btn editor-view__btn--outline" @click="handleClearCanvas">清空</button>
          <button class="editor-view__btn editor-view__btn--outline" :disabled="saving" @click="handleSave">
            <el-icon v-if="saving" class="is-loading" :size="14"><Refresh /></el-icon>
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <button
            v-if="boardStore.id"
            class="editor-view__btn editor-view__btn--primary"
            :disabled="publishing"
            @click="handlePublish"
          >
            <el-icon v-if="publishing" class="is-loading" :size="14"><Refresh /></el-icon>
            {{ publishing ? '发布中...' : '发布' }}
          </button>
        </template>
        <template v-if="mode === 'preview'">
          <!-- Mode switch back to edit -->
          <button
            class="editor-view__icon-btn"
            :class="{ 'editor-view__icon-btn--active': showLogPanel }"
            title="执行日志"
            @click="showLogPanel = !showLogPanel"
          >
            <el-icon :size="14"><Document /></el-icon>
          </button>
          <button
            class="editor-view__icon-btn"
            :class="{ 'editor-view__icon-btn--active': showCodePanel }"
            title="Store 数据"
            @click="showCodePanel = !showCodePanel"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="5 4 1 8 5 12" />
              <polyline points="11 4 15 8 11 12" />
              <line x1="9" y1="2" x2="7" y2="14" />
            </svg>
          </button>
          <div class="editor-view__divider" />
          <button class="editor-view__btn editor-view__btn--outline" @click="editorStore.setMode('edit')">
            <el-icon :size="12"><EditPen /></el-icon>
            <span>退出预览</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Body: left panel + canvas + right panel -->
    <div class="editor-view__body">
      <!-- Left panel -->
      <div
        v-if="mode === 'edit'"
        :class="['editor-view__left', { 'editor-view__left--closed': !leftPanelVisible }]"
      >
        <EditorLeftPanel
          :schema-status="boardStore.status"
          :schema-type="'form'"
          :schema-id="boardStore.id || null"
        />
      </div>

      <!-- Center: canvas + debug panels -->
      <div class="editor-view__center">
        <div class="editor-view__canvas-scroll">
          <EditorCanvas
            ref="editorCanvasRef"
            @open-event="handleOpenEvent"
            @open-rule="handleOpenRule"
            @open-api="handleOpenApi"
            @open-variables="handleOpenVariables"
            @save-preview="handleSavePreview"
          />
        </div>
        <EventLogPanel v-if="mode === 'preview' && showLogPanel" />

        <!-- Store 数据面板（全屏覆盖） -->
        <div v-if="mode === 'preview' && showCodePanel" class="editor-view__code-overlay">
          <div class="editor-view__code-header">
            <span class="editor-view__code-title">Store 数据</span>
            <el-button type="danger" text size="small" @click="showCodePanel = false">关闭</el-button>
          </div>
          <div class="editor-view__code-scroll">
            <pre class="editor-view__code-pre">{{ storeSnapshot }}</pre>
          </div>
        </div>

      </div>

      <!-- Right panel -->
      <div
        v-if="mode === 'edit'"
        :class="['editor-view__right', { 'editor-view__right--closed': !rightPanelVisible }]"
      >
        <PropertyPanel />
      </div>

      <!-- AI drawer -->
      <div
        v-if="mode === 'edit'"
        :class="['editor-view__ai-drawer', { 'editor-view__ai-drawer--open': showAiDrawer }]"
      >
        <div class="editor-view__ai-inner">
          <micro-app
            v-if="showAiDrawer"
            name="ai-sidebar-editor"
            :url="aiBaseUrl + '?agent=editor'"
            :data="aiDrawerData"
            iframe
            class="editor-view__ai-iframe"
            @datachange="handleAiDataChange"
          />
        </div>
      </div>
    </div>

    <!-- 版本对比面板 -->
    <el-drawer
      v-model="showVersionCompare"
      title="版本对比"
      direction="rtl"
      size="560px"
      :destroy-on-close="true"
    >
      <SchemaVersionCompare
        @close="showVersionCompare = false"
        @version-loaded="handleVersionLoaded"
      />
    </el-drawer>
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

    &--preview {
      background: var(--el-color-primary-light-9);
      border-bottom-color: var(--el-color-primary-light-5);
    }
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
    padding: 0;

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

  &__preview-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-color-primary);
    padding: 3px 10px;
    background: var(--el-color-primary-light-8);
    border-radius: var(--el-border-radius-small);
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

  &__auto-save-badge {
    font-size: 11px;
    color: var(--el-color-success);
    white-space: nowrap;
    flex-shrink: 0;
    animation: autoSavePulse 1.5s ease-in-out infinite;
  }

  &__dirty-badge {
    font-size: 11px;
    color: var(--el-color-warning);
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__version-panel {
    max-height: 400px;
    overflow-y: auto;
  }

  &__version-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    margin-bottom: 8px;
  }

  &__version-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__version-pagination {
    display: flex;
    justify-content: center;
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid var(--el-border-color-lighter);
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

  &__left,
  &__right,
  &__ai-drawer {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--el-bg-color);
  }

  &__left {
    width: 260px;
    border-right: 1px solid var(--el-border-color-lighter);

    &--closed {
      width: 0;
      border-right: none;
    }

    > * {
      min-width: 260px;
    }
  }

  &__center {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--el-fill-color-light);
  }

  &__canvas-scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 24px;
  }

  &__right {
    width: 300px;
    border-left: 1px solid var(--el-border-color-lighter);

    &--closed {
      width: 0;
      border-left: none;
    }

    > * {
      min-width: 300px;
    }
  }

  &__ai-btn {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  &__ai-label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    background: var(--el-color-primary);
    color: var(--el-color-white);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    transition: all 0.15s;
  }

  &__icon-btn--active &__ai-label {
    box-shadow: 0 0 0 2px var(--el-color-primary-light-5);
  }

  &__ai-drawer {
    width: 400px;
    border-left: 1px solid var(--el-border-color-lighter);

    &--open {
      width: 400px;
    }

    &:not(&--open) {
      width: 0;
      border-left: none;
    }
  }

  &__ai-inner {
    width: 400px;
    height: 100%;
  }

  &__ai-iframe {
    width: 400px;
    height: 100%;
    border: none;
    display: block;
  }

  &__code-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    background: var(--el-bg-color);
    z-index: 50;
  }

  &__code-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;
  }

  &__code-title {
    font-size: 12px;
    font-weight: 600;
    color: #303133;
  }

  &__code-scroll {
    flex: 1;
    overflow: auto;
  }

  &__code-pre {
    margin: 0;
    padding: 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: #303133;
    white-space: pre-wrap;
    word-break: break-all;
  }

  &__shortcuts {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__shortcuts-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    padding-bottom: 6px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    margin-bottom: 4px;
  }

  &__shortcut-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 0;
  }

  &__shortcut-label {
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  &__shortcut-keys {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    color: var(--el-text-color-secondary);

    kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 20px;
      padding: 0 5px;
      font-size: 11px;
      font-family: inherit;
      color: var(--el-text-color-primary);
      background: var(--el-fill-color-light);
      border: 1px solid var(--el-border-color);
      border-radius: 3px;
      box-shadow: 0 1px 0 var(--el-border-color);
    }
  }

  @keyframes autoSavePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
}
</style>
