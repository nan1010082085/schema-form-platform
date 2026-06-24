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
 *
 * 已拆分为子组件：
 * - EditorViewToolbar  — 顶部工具栏
 * - EditorViewLeftPanel — 左侧面板
 * - EditorViewRightPanel — 右侧属性面板
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { connect as connectSocket, onAiApply, onAiPublished } from '@schema-form/platform-shared/socket'
import type { AiApplyEvent, AiPublishedEvent } from '@schema-form/platform-shared/socket'
import { useSnapshot } from '@/composables/useSnapshot'
import { useAutoSave } from '@/composables/useAutoSave'
import { useBoardStore } from '@/stores/board'
import { useWidgetStore } from '@/stores/widget'
import { parseSchemaJson } from '@/utils/parseSchemaJson'
import { useEditorStore } from '@/stores/editor'
import { useApiStore } from '@/stores/api'
import { registerAllWidgets } from '@/widgets'
import EditorCanvas from '@/components/Editor/EditorCanvas.vue'
import EventLogPanel from '@/components/Editor/EventLogPanel.vue'
import { setLogCollector } from '@/composables/useLogger'
import { useEventLog } from '@/composables/useEventLog'
import type { Widget } from '@/widgets/base/types'
import { fetchVersion } from '@/utils/apiClient'
import SchemaVersionCompare from '@/components/SchemaVersionCompare.vue'
import { useSchemaVersionStore } from '@/stores/schemaVersion'
import SaveTemplateDialog from '@/components/Editor/SaveTemplateDialog.vue'
import EditorViewToolbar from './EditorViewToolbar.vue'
import EditorViewLeftPanel from './EditorViewLeftPanel.vue'
import EditorViewRightPanel from './EditorViewRightPanel.vue'
import styles from './EditorView.module.scss'

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
const aiIframeRef = ref<HTMLIFrameElement>()

// 自动保存：脏数据 60 秒后自动触发保存（偏好持久化到 localStorage）
const autoSaveEnabled = ref(localStorage.getItem('editor_auto_save') !== 'off')
const { isAutoSaving } = useAutoSave({
  delayMs: 60_000,
  enabled: autoSaveEnabled,
  onSave: handleSave,
})
function toggleAutoSave() {
  autoSaveEnabled.value = !autoSaveEnabled.value
  localStorage.setItem('editor_auto_save', autoSaveEnabled.value ? 'on' : 'off')
}

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
// Load schema from API
// ================================================================

const currentEditId = ref('')
const currentVersion = ref('')

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
      // 解析 json，支持新格式 { widgets, board } 和旧格式 Widget[]
      const json = detail.json as unknown
      let widgets: Widget[] = []
      let boardConfig: { canvas?: Record<string, unknown>; variables?: unknown[]; events?: unknown[] } = {}

      if (json && typeof json === 'object' && 'widgets' in json && 'board' in json) {
        // 新格式：{ widgets: Widget[], board: { canvas, variables, events } }
        const data = json as { widgets: Widget[]; board: { canvas?: Record<string, unknown>; variables?: unknown[]; events?: unknown[] } }
        widgets = data.widgets
        boardConfig = data.board || {}
      } else {
        // 旧格式：直接是 Widget[]
        widgets = json as Widget[]
      }

      boardStore.loadBoard({
        id: detail.id,
        name: detail.name,
        status: (detail.status as 'draft' | 'published') || 'draft',
        canvas: boardConfig.canvas,
        variables: boardConfig.variables as any[],
        events: boardConfig.events as any[],
      })
      widgetStore.loadWidgets(widgets)
      currentEditId.value = editId
      currentVersion.value = version
    }
  } else if (id) {
    const detail = await apiStore.fetchSchemaById(id)
    if (detail) {
      // 解析 json，支持新格式 { widgets, board } 和旧格式 Widget[]
      const json = detail.json as unknown
      let widgets: Widget[] = []
      let boardConfig: { canvas?: Record<string, unknown>; variables?: unknown[]; events?: unknown[] } = {}

      if (json && typeof json === 'object' && 'widgets' in json && 'board' in json) {
        // 新格式：{ widgets: Widget[], board: { canvas, variables, events } }
        const data = json as { widgets: Widget[]; board: { canvas?: Record<string, unknown>; variables?: unknown[]; events?: unknown[] } }
        widgets = data.widgets
        boardConfig = data.board || {}
      } else {
        // 旧格式：直接是 Widget[]
        widgets = json as Widget[]
      }

      boardStore.loadBoard({
        id: detail.id,
        name: detail.name,
        status: (detail.status as 'draft' | 'published') || 'draft',
        canvas: boardConfig.canvas,
        variables: boardConfig.variables as any[],
        events: boardConfig.events as any[],
      })
      widgetStore.loadWidgets(widgets)
      currentEditId.value = detail.editId
      currentVersion.value = detail.version
    }
  }

  // Set default board name if empty
  if (!boardStore.name) {
    boardStore.name = '未命名画布'
  }

  // 从实例列表进入时，始终为编辑模式
  editorStore.setMode('edit')

  // Socket: 监听 AI 推送事件
  connectSocket()
  onAiApply(async (data: AiApplyEvent) => {
    if (data.type === 'schema' && Array.isArray(data.payload)) {
      const { widgets } = parseSchemaJson(data.payload)
      // 逐个插入到当前画布，而非替换
      for (const widget of widgets) {
        widgetStore.addWidget(widget)
      }
      ElMessage.success(`已插入 ${widgets.length} 个组件到画布`)

      // 自动保存并生成缩略图
      await nextTick()
      await handleSave()
    }
  })
  onAiPublished((data: AiPublishedEvent) => {
    if (data.type === 'schema') {
      ElMessage.success('AI 已发布 Schema')
    }
  })
})

// ================================================================
// AI iframe 通信
// ================================================================

function sendContextToAi() {
  const iframe = aiIframeRef.value
  if (!iframe?.contentWindow) return

  const context = {
    type: 'ai:set-context',
    payload: {
      source: 'editor',
      schemaId: boardStore.id,
      editorMode: editorStore.mode,
    },
  }

  const currentSchema = {
    type: 'ai:current-schema',
    payload: widgetStore.widgets,
  }

  iframe.contentWindow.postMessage(context, '*')
  iframe.contentWindow.postMessage(currentSchema, '*')
}

function onAiIframeLoad() {
  // 延迟发送，确保 AI sidebar 已准备好接收消息
  setTimeout(sendContextToAi, 500)
}

// 监听 Schema 变化，实时更新 AI sidebar
watch(
  () => widgetStore.widgets,
  () => {
    if (showAiDrawer.value) {
      sendContextToAi()
    }
  },
  { deep: true },
)

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
// Toolbar actions (keyboard shortcut handlers — duplicate of toolbar's for global hotkeys)
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
      {
        canvas: boardStore.canvas,
        variables: boardStore.variables,
        events: boardStore.events,
      },
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

// ================================================================
// Save as template
// ================================================================

const showSaveTemplateDialog = ref(false)

function handleSaveCommand(command: string) {
  if (command === 'save') {
    handleSave()
  } else if (command === 'saveAsTemplate') {
    showSaveTemplateDialog.value = true
  }
}

async function handlePublish() {
  if (!boardStore.id || _publishingLock) return

  try {
    await ElMessageBox.confirm(
      '确认发布当前版本？',
      '发布确认',
      {
        confirmButtonText: '发布',
        cancelButtonText: '取消',
        type: 'info',
      }
    )

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
  } catch {
    // 用户取消
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

function handleVersionLoadedFromToolbar(version: string) {
  currentVersion.value = version
}
</script>

<template>
  <div :class="styles.editorView" @keydown="handleKeyDown">
    <!-- Top toolbar -->
    <EditorViewToolbar
      :mode="mode"
      :current-version="currentVersion"
      :current-edit-id="currentEditId"
      :auto-save-enabled="autoSaveEnabled"
      :is-auto-saving="isAutoSaving"
      :saving="saving"
      :publishing="publishing"
      :left-panel-visible="leftPanelVisible"
      :right-panel-visible="rightPanelVisible"
      :show-ai-drawer="showAiDrawer"
      :show-log-panel="showLogPanel"
      :show-code-panel="showCodePanel"
      @save="handleSave"
      @publish="handlePublish"
      @save-command="handleSaveCommand"
      @load-version="handleVersionLoadedFromToolbar"
      @open-version-compare="handleOpenVersionCompare"
      @toggle-auto-save="toggleAutoSave"
      @update-left-panel="leftPanelVisible = !leftPanelVisible"
      @update-right-panel="rightPanelVisible = !rightPanelVisible"
      @update-ai-drawer="showAiDrawer = !showAiDrawer"
      @update-log-panel="showLogPanel = !showLogPanel"
      @update-code-panel="showCodePanel = !showCodePanel"
    />

    <!-- Body: left panel + canvas + right panel -->
    <div :class="styles.body">
      <!-- Left panel -->
      <EditorViewLeftPanel
        v-if="mode === 'edit'"
        :visible="leftPanelVisible"
        :schema-status="boardStore.status"
        :schema-type="'form'"
        :schema-id="boardStore.id || null"
      />

      <!-- Center: canvas + debug panels -->
      <div :class="styles.center">
        <div :class="styles.canvasScroll">
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
        <div v-if="mode === 'preview' && showCodePanel" :class="styles.codeOverlay">
          <div :class="styles.codeHeader">
            <span :class="styles.codeTitle">Store 数据</span>
            <el-button type="danger" text size="small" @click="showCodePanel = false">关闭</el-button>
          </div>
          <div :class="styles.codeScroll">
            <pre :class="styles.codePre">{{ storeSnapshot }}</pre>
          </div>
        </div>
      </div>

      <!-- Right panel -->
      <EditorViewRightPanel
        v-if="mode === 'edit'"
        :visible="rightPanelVisible"
      />

      <!-- AI drawer -->
      <div
        v-if="mode === 'edit'"
        :class="[styles.aiDrawer, { [styles.aiDrawerOpen]: showAiDrawer }]"
      >
        <div :class="styles.aiInner">
          <iframe
            v-if="showAiDrawer"
            ref="aiIframeRef"
            :src="aiBaseUrl + '?agent=editor'"
            :class="styles.aiIframe"
            frameborder="0"
            @load="onAiIframeLoad"
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

    <!-- 保存为模板对话框 -->
    <SaveTemplateDialog
      v-model:visible="showSaveTemplateDialog"
      :widgets="widgetStore.widgets as any"
      @close="showSaveTemplateDialog = false"
      @saved="showSaveTemplateDialog = false"
    />
  </div>
</template>
