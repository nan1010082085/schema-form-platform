<script setup lang="ts">
/**
 * EditorViewToolbar — 顶部工具栏子组件
 *
 * 从 EditorView.vue 拆分而来，负责渲染整个工具栏区域。
 * 直接访问全局 Store 读取状态，通过 emits 向父组件触发操作。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'
import { useBoardStore } from '@/stores/board'
import { useEditorStore } from '@/stores/editor'
import { useWidgetStore } from '@/stores/widget'
import { useSchemaValidation } from '@/composables/useSchemaValidation'
import { fetchVersions, fetchVersion } from '@/utils/apiClient'
import { parseSchemaJson } from '@/utils/parseSchemaJson'
import type { VersionEntry } from '@/types/api'
import styles from './EditorView.module.scss'

const props = defineProps<{
  mode: 'edit' | 'preview'
  currentVersion: string
  currentEditId: string
  autoSaveEnabled: boolean
  isAutoSaving: boolean
  saving: boolean
  publishing: boolean
  leftPanelVisible: boolean
  rightPanelVisible: boolean
  showAiDrawer: boolean
  showLogPanel: boolean
  showCodePanel: boolean
}>()

const emit = defineEmits<{
  save: []
  publish: []
  saveCommand: [command: string]
  loadVersion: [version: string]
  openVersionCompare: []
  toggleAutoSave: []
  updateLeftPanel: []
  updateRightPanel: []
  updateAiDrawer: []
  updateLogPanel: []
  updateCodePanel: []
  zoomIn: []
  zoomOut: []
  clearCanvas: []
}>()

const router = useRouter()
const boardStore = useBoardStore()
const editorStore = useEditorStore()
const widgetStore = useWidgetStore()
const validation = useSchemaValidation()

// ================================================================
// Canvas size
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
// Version management (toolbar-local state)
// ================================================================

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
  if (!props.currentEditId) return
  versionLoading.value = true
  versionPage.value = page
  try {
    const res = await fetchVersions(props.currentEditId, page, versionPageSize)
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
  if (!props.currentEditId) return
  try {
    const detail = await fetchVersion(props.currentEditId, entry.version)
    const { widgets, boardConfig } = parseSchemaJson(detail.json)
    boardStore.loadBoard({
      id: detail.id,
      name: detail.name,
      status: (detail.status as 'draft' | 'published') || 'draft',
      canvas: boardConfig.canvas,
      variables: boardConfig.variables as any[],
      events: boardConfig.events as any[],
    })
    widgetStore.loadWidgets(widgets)
    editorStore.markClean()
    versionPopoverVisible.value = false
    emit('loadVersion', entry.version)
    ElMessage.success(`已加载版本 ${formatVersion(entry.version)}`)
  } catch {
    ElMessage.error('加载版本失败')
  }
}

// ================================================================
// Toolbar-local actions (delegate to stores directly)
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

function handleDeleteWidget() {
  if (!editorStore.selectedId) return
  widgetStore.removeWidget(editorStore.selectedId)
  editorStore.clearSelection()
  editorStore.pushHistory([...widgetStore.widgets])
}

function handleZoomIn() {
  boardStore.setZoom(boardStore.canvas.zoom + 10)
}

function handleZoomOut() {
  boardStore.setZoom(boardStore.canvas.zoom - 10)
}

function handleClearCanvas() {
  widgetStore.clearWidgets()
  editorStore.clearSelection()
  editorStore.pushHistory([])
}
</script>

<template>
  <div :class="[styles.toolbar, { [styles.toolbarPreview]: mode === 'preview' }]">
    <!-- Left: back + name -->
    <div :class="styles.toolbarLeft">
      <button :class="styles.iconBtn" title="返回列表" @click="router.push('/instances')">
        <AppIcon name="arrow-left" :size="14" />
      </button>
      <div :class="styles.divider" />
      <template v-if="mode === 'edit'">
        <input
          v-model="boardStore.name"
          :class="styles.nameInput"
          placeholder="未命名画布"
        />
        <span v-if="currentVersion" :class="styles.versionBadge">v{{ formatVersion(currentVersion) }}</span>
        <el-tooltip :content="autoSaveEnabled ? '关闭自动保存' : '开启自动保存'" placement="bottom">
          <button
            :class="[styles.iconBtn, styles.autoSaveToggle, { [styles.autoSaveToggleOn]: autoSaveEnabled }]"
            @click="emit('toggleAutoSave')"
          >
            <AppIcon name="refresh" :size="14" />
          </button>
        </el-tooltip>
        <span v-if="isAutoSaving" :class="styles.autoSaveBadge">自动保存中...</span>
        <span v-else-if="editorStore.isDirty" :class="styles.dirtyBadge">未保存</span>
      </template>
    </div>

    <!-- Center: panel toggles + operations + AI -->
    <div v-if="mode === 'edit'" :class="styles.toolbarCenter">
      <el-tooltip :content="leftPanelVisible ? '隐藏部件面板' : '显示部件面板'" placement="bottom">
        <button
          :class="[styles.iconBtn, { [styles.iconBtnActive]: leftPanelVisible }]"
          title="部件面板"
          @click="emit('updateLeftPanel')"
        >
          <AppIcon name="grid" :size="14" />
        </button>
      </el-tooltip>
      <div :class="styles.btnGroup">
        <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
          <button :class="styles.iconBtn" :disabled="!editorStore.canUndo" @click="handleUndo">
            <AppIcon name="back" :size="14" />
          </button>
        </el-tooltip>
        <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
          <button :class="styles.iconBtn" :disabled="!editorStore.canRedo" @click="handleRedo">
            <AppIcon name="refresh" :size="14" />
          </button>
        </el-tooltip>
      </div>
      <el-tooltip :content="rightPanelVisible ? '隐藏属性面板' : '显示属性面板'" placement="bottom">
        <button
          :class="[styles.iconBtn, { [styles.iconBtnActive]: rightPanelVisible }]"
          title="属性面板"
          @click="emit('updateRightPanel')"
        >
          <AppIcon name="setting" :size="14" />
        </button>
      </el-tooltip>
      <div :class="styles.btnGroup">
        <el-tooltip content="复制部件 (Ctrl+C)" placement="bottom">
          <button :class="styles.iconBtn" :disabled="!editorStore.selectedId" @click="handleCopyWidget">
            <AppIcon name="copy-document" :size="14" />
          </button>
        </el-tooltip>
        <el-tooltip content="删除部件 (Del)" placement="bottom">
          <button :class="styles.iconBtn" :disabled="!editorStore.selectedId" @click="handleDeleteWidget">
            <AppIcon name="delete" :size="14" />
          </button>
        </el-tooltip>
      </div>
      <div :class="styles.divider" />
      <el-tooltip content="AI 助手" placement="bottom">
        <button
          :class="[styles.iconBtn, styles.aiBtn, { [styles.iconBtnActive]: showAiDrawer }]"
          @click="emit('updateAiDrawer')"
        >
          <span :class="styles.aiLabel">AI</span>
        </button>
      </el-tooltip>
      <div :class="styles.divider" />
      <!-- 快捷键帮助 -->
      <el-tooltip placement="bottom" :width="320">
        <template #content>
          <div :class="styles.shortcuts">
            <div :class="styles.shortcutsTitle">快捷键</div>
            <div :class="styles.shortcutRow">
              <span :class="styles.shortcutLabel">撤销</span>
              <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>Z</kbd></span>
            </div>
            <div :class="styles.shortcutRow">
              <span :class="styles.shortcutLabel">重做</span>
              <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></span>
            </div>
            <div :class="styles.shortcutRow">
              <span :class="styles.shortcutLabel">复制部件</span>
              <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>C</kbd></span>
            </div>
            <div :class="styles.shortcutRow">
              <span :class="styles.shortcutLabel">粘贴部件</span>
              <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>V</kbd></span>
            </div>
            <div :class="styles.shortcutRow">
              <span :class="styles.shortcutLabel">删除部件</span>
              <span :class="styles.shortcutKeys"><kbd>Delete</kbd></span>
            </div>
            <div :class="styles.shortcutRow">
              <span :class="styles.shortcutLabel">保存</span>
              <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>S</kbd></span>
            </div>
          </div>
        </template>
        <button :class="styles.iconBtn" title="快捷键帮助">
          <AppIcon name="question-filled" :size="14" />
        </button>
      </el-tooltip>
      <div :class="styles.divider" />
      <el-tooltip content="预览" placement="bottom">
        <button
          :class="styles.iconBtn"
          title="预览"
          @click="editorStore.setMode('preview')"
        >
          <AppIcon name="view" :size="14" />
        </button>
      </el-tooltip>
    </div>

    <!-- Center: preview mode -->
    <div v-if="mode === 'preview'" :class="styles.toolbarCenter">
      <span :class="styles.previewLabel">预览模式</span>
    </div>

    <!-- Right: version + save + publish -->
    <div :class="styles.toolbarRight">
      <template v-if="mode === 'edit'">
        <!-- Canvas size -->
        <el-dropdown trigger="click" @command="handleCanvasSizeChange">
          <button :class="styles.iconBtn" title="画布尺寸">
            <AppIcon name="full-screen" :size="14" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="p in canvasSizePresets"
                :key="p.value"
                :command="p.value"
              >{{ p.label }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div :class="styles.divider" />
        <!-- Zoom -->
        <div :class="styles.zoomGroup">
          <button :class="styles.iconBtn" :disabled="boardStore.canvas.zoom <= 50" @click="handleZoomOut">-</button>
          <span :class="styles.zoomValue">{{ boardStore.canvas.zoom }}%</span>
          <button :class="styles.iconBtn" :disabled="boardStore.canvas.zoom >= 200" @click="handleZoomIn">+</button>
        </div>
        <div :class="styles.divider" />
        <!-- Version history -->
        <el-popover
          v-model:visible="versionPopoverVisible"
          placement="bottom-end"
          :width="320"
          trigger="click"
          @show="loadVersionList()"
        >
          <div :class="styles.versionPanel">
            <div :class="styles.versionHeader">
              <span :class="styles.versionTitle">版本历史</span>
              <el-button size="small" text @click="loadVersionList(versionPage)">
                <AppIcon name="refresh" />
              </el-button>
            </div>
            <div v-if="versionLoading" :class="styles.versionLoading">加载中...</div>
            <div v-else-if="versionList.length === 0" :class="styles.versionEmpty">暂无版本记录</div>
            <div v-else :class="styles.versionList">
              <div
                v-for="entry in versionList"
                :key="entry.version"
                :class="[styles.versionItem, { [styles.versionItemCurrent]: entry.version === currentVersion }]"
              >
                <div :class="styles.versionInfo">
                  <span :class="styles.versionTime">{{ formatVersion(entry.version) }}</span>
                  <div :class="styles.versionTags">
                    <el-tag v-if="entry.published" type="success" size="small">已发布</el-tag>
                    <el-tag v-if="entry.version === currentVersion" size="small">当前</el-tag>
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
            <div v-if="versionTotal > versionPageSize" :class="styles.versionPagination">
              <el-pagination
                v-model:current-page="versionPage"
                :page-size="versionPageSize"
                :total="versionTotal"
                small
                layout="prev, pager, next"
                @current-change="handleVersionPageChange"
              />
            </div>
          </div>
          <template #reference>
            <button :class="styles.iconBtn" title="版本历史">
              <AppIcon name="clock" :size="14" />
            </button>
          </template>
        </el-popover>
        <!-- Version compare -->
        <el-tooltip content="版本对比" placement="bottom">
          <button
            :class="styles.iconBtn"
            :disabled="!currentEditId"
            title="版本对比"
            @click="emit('openVersionCompare')"
          >
            <AppIcon name="document-copy" :size="14" />
          </button>
        </el-tooltip>
        <el-button size="small" @click="handleClearCanvas">清空</el-button>
        <el-dropdown trigger="click" @command="(cmd: string) => emit('saveCommand', cmd)">
          <el-button size="small" :loading="saving">
            <span v-if="saving">保存中...</span>
            <span v-else :class="styles.saveBtnContent">
              保存
              <AppIcon name="arrow-down" :size="10" />
            </span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="save" :class="styles.dropdownItem">
                <AppIcon name="document" :size="14" />
                <span :class="styles.dropdownLabel">保存</span>
              </el-dropdown-item>
              <el-dropdown-item command="saveAsTemplate" :class="styles.dropdownItem">
                <AppIcon name="grid" :size="14" />
                <span :class="styles.dropdownLabel">保存为模板</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          v-if="boardStore.id"
          type="primary"
          size="small"
          :loading="publishing"
          @click="emit('publish')"
        >
          {{ publishing ? '发布中...' : '发布' }}
        </el-button>
      </template>
      <template v-if="mode === 'preview'">
        <!-- Mode switch back to edit -->
        <button
          :class="[styles.iconBtn, { [styles.iconBtnActive]: showLogPanel }]"
          title="执行日志"
          @click="emit('updateLogPanel')"
        >
          <AppIcon name="document" :size="14" />
        </button>
        <button
          :class="[styles.iconBtn, { [styles.iconBtnActive]: showCodePanel }]"
          title="Store 数据"
          @click="emit('updateCodePanel')"
        >
          <AppIcon name="data-line" :size="14" />
        </button>
        <div :class="styles.divider" />
        <!-- Schema 校验 -->
        <el-popover
          placement="bottom-end"
          :width="420"
          trigger="click"
          @before-enter="validation.runValidation()"
        >
          <template #reference>
            <button
              :class="styles.iconBtn"
              title="Schema 校验"
            >
              <el-badge
                v-if="validation.errorCount.value > 0"
                :value="validation.errorCount.value"
                :max="99"
                type="danger"
              >
                <AppIcon name="warning" :size="14" />
              </el-badge>
              <AppIcon v-else name="success" :size="14" />
            </button>
          </template>
          <div v-if="validation.issues.value.length === 0" style="text-align: center; padding: 20px; color: var(--color-success);">
            ✓ 校验通过，未发现问题
          </div>
          <div v-else style="max-height: 360px; overflow-y: auto;">
            <div style="padding: 0 0 8px; font-size: 13px; font-weight: 600; border-bottom: 1px solid var(--border-color-lighter); margin-bottom: 8px;">
              {{ validation.errorCount.value }} 错误 · {{ validation.warningCount.value }} 警告
            </div>
            <div
              v-for="(issue, idx) in validation.issues.value"
              :key="idx"
              style="padding: 6px 0; font-size: 12px; border-bottom: 1px solid var(--border-color-lighter);"
            >
              <el-tag
                :type="issue.severity === 'error' ? 'danger' : issue.severity === 'warning' ? 'warning' : 'info'"
                size="small"
                style="margin-right: 6px;"
              >
                {{ issue.severity }}
              </el-tag>
              <span style="color: var(--text-color-secondary);">{{ issue.message }}</span>
            </div>
          </div>
        </el-popover>
        <div :class="styles.divider" />
        <el-button size="small" @click="editorStore.setMode('edit')">
          <AppIcon name="edit" :size="12" />
          <span>退出预览</span>
        </el-button>
      </template>
    </div>
  </div>
</template>
