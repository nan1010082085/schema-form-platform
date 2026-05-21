<script setup lang="ts">
/**
 * FgDialog -- Schema-aware dialog component.
 *
 * Supports three modes:
 * - Edit mode (editable=true): Shows a compact preview card on the canvas.
 *   The actual dialog opens via the editor store (editingDialogComponentId)
 *   and renders a mini-canvas with drag-drop support for editing children.
 * - Preview/Runtime mode: Renders normally as an el-dialog with
 *   dialogSchema rendered via SchemaRender.
 * - Microapp mode (contentMode='microapp'): Loads a published form via
 *   iframe and communicates via postMessage.
 */
import { reactive, provide, inject, watch, ref, computed, onBeforeUnmount } from 'vue'
import { Loading, CircleCloseFilled } from '@element-plus/icons-vue'
import FormGrid from '@/components/FormGrid/index.vue'
import { useEditorStore } from '@/stores/editor'
import { createMicroappHost, type MicroappHostApi } from '@/microapp/postMessage'
import {
  FORM_GRID_FORM_KEY,
  FORM_GRID_CONTEXT_KEY,
  FORM_GRID_LINKAGE_KEY,
  ACTION_EMIT_KEY,
  FORM_GRID_API_KEY,
} from '../../types'
import type { FormSchemaItem, FormData } from '../../types'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  width?: string
  dialogSchema?: FormSchemaItem[]
  initialData?: FormData
  fullscreen?: boolean
  closeOnClickModal?: boolean
  showFooter?: boolean
  confirmText?: string
  cancelText?: string
  confirmLoading?: boolean
  /** Editor mode: show preview card + enable inline editing */
  editable?: boolean
  /** Whether a drag operation is active in the editor */
  isDragging?: boolean
  /** Component ID for editor store communication */
  componentId?: string
  /** Path in the schema tree (passed from SchemaRender) */
  path?: number[]
  /** Children schema items for edit mode (from schema.children) */
  children?: FormSchemaItem[]
  /**
   * 内容模式
   * - 'edit'（默认）：渲染 children/dialogSchema 子组件
   * - 'microapp'：通过 iframe 加载已发布的表单
   */
  contentMode?: 'edit' | 'microapp'
  /**
   * microapp 模式下的已发布 Schema publishId。
   * 必须与 contentMode='microapp' 配合使用。
   */
  publishId?: string
  /**
   * microapp 的 API 基础 URL。
   * 未指定时使用当前页面的 origin。
   */
  microappBaseUrl?: string
}>(), {
  width: '600px',
  showFooter: true,
  confirmText: '确定',
  cancelText: '取消',
  contentMode: 'edit',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: FormData]
  cancel: []
  close: []
  'container-drop': [payload: { parentPath: number[]; index: number; dragDataRaw: string }]
}>()

// ---- Editor store integration ----
const editorStore = useEditorStore()

// ---- Microapp mode state ----
const microappLoading = ref(false)
const microappError = ref('')
const microappIframeRef = ref<HTMLIFrameElement | null>(null)
let microappHost: MicroappHostApi | null = null

/** script 闭合标签 — 拆分避免 Vue SFC 解析器误判 */
const SC = '<' + '/script>'
const SO = '<script'

/**
 * 构建 microapp 的 iframe HTML 内容。
 * 使用 blob URL 避免 srcdoc 中 script 标签的解析问题。
 */
function buildMicroappHtml(publishId: string, baseUrl: string): string {
  return '<!DOCTYPE html>\n<html>\n<head>\n'
    + '<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '<link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">\n'
    + '<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif}</style>\n'
    + '</head>\n<body>\n'
    + '<div id="microapp-root"></div>\n'
    + SO + ' src="https://unpkg.com/vue@3/dist/vue.global.prod.js">' + SC + '\n'
    + SO + ' src="https://unpkg.com/element-plus/dist/index.full.min.js">' + SC + '\n'
    + SO + ' src="' + baseUrl + '/microapp/schema-form-microapp.umd.js">' + SC + '\n'
    + SO + '>\n'
    + '  SchemaFormMicroapp.loadMicroapp({\n'
    + "    publishId: '" + publishId + "',\n"
    + "    container: '#microapp-root',\n"
    + "    baseUrl: '" + baseUrl + "/api',\n"
    + '  })\n'
    + SC + '\n'
    + '</body>\n</html>'
}

/** iframe onload 回调：初始化 postMessage host */
function handleMicroappIframeLoad() {
  const iframe = microappIframeRef.value
  if (!iframe) return

  microappHost = createMicroappHost(iframe)

  microappHost.on('ready', () => {
    microappLoading.value = false
    microappError.value = ''
  })

  microappHost.on('submitSuccess', (data) => {
    emit('confirm', data as FormData)
    emit('update:modelValue', false)
  })

  microappHost.on('submitError', (error) => {
    microappError.value = String(error)
  })

  microappHost.on('error', (error) => {
    microappError.value = String(error)
    microappLoading.value = false
  })
}

/** 当前 blob URL（用于清理） */
let currentBlobUrl: string | null = null

/** 启动 microapp 加载 */
function startMicroappLoad() {
  if (props.contentMode !== 'microapp' || !props.publishId) return
  microappLoading.value = true
  microappError.value = ''
  // 释放旧 blob URL
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }
}

/** 清理 microapp 资源 */
function cleanupMicroapp() {
  if (microappHost) {
    microappHost.destroy()
    microappHost = null
  }
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }
  microappLoading.value = false
  microappError.value = ''
}

/** 构建 iframe 的 blob URL src */
const microappSrc = computed(() => {
  if (props.contentMode !== 'microapp' || !props.publishId) return ''
  const baseUrl = props.microappBaseUrl || window.location.origin
  const html = buildMicroappHtml(props.publishId, baseUrl)
  const blob = new Blob([html], { type: 'text/html' })
  currentBlobUrl = URL.createObjectURL(blob)
  return currentBlobUrl
})

// 监听 dialog 打开，启动 microapp 加载
watch(() => props.modelValue, (open) => {
  if (open && props.contentMode === 'microapp') {
    startMicroappLoad()
  } else if (!open) {
    cleanupMicroapp()
  }
})

onBeforeUnmount(() => {
  cleanupMicroapp()
})

// ---- Local dialog visibility (edit mode manages its own open/close) ----
const localVisible = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  localVisible.value = val
})

// Auto-open when editor store targets this dialog
watch(() => editorStore.editingDialogId, (id) => {
  if (id && id === props.componentId) {
    localVisible.value = true
  }
})

function handleLocalClose() {
  localVisible.value = false
  if (props.editable && props.componentId) {
    editorStore.closeDialogEditor()
  }
  emit('update:modelValue', false)
  emit('close')
}

// ---- Runtime: Isolated formData for preview/runtime mode ----
const dialogFormData = reactive<FormData>({})

watch(
  () => [props.modelValue, props.initialData] as const,
  ([open, initData]) => {
    if (open) {
      Object.keys(dialogFormData).forEach(k => delete dialogFormData[k])
      if (initData) Object.assign(dialogFormData, initData)
    }
  },
  { immediate: true },
)

// Inherit context from parent, override formData with dialog-scoped copy
const parentContext = inject(FORM_GRID_CONTEXT_KEY, null)
const parentLinkage = inject(FORM_GRID_LINKAGE_KEY, undefined)
const parentActionEmit = inject(ACTION_EMIT_KEY, undefined)
const parentFormApi = inject(FORM_GRID_API_KEY, undefined)
provide(FORM_GRID_CONTEXT_KEY, parentContext!)
provide(FORM_GRID_FORM_KEY, dialogFormData)
if (parentLinkage) provide(FORM_GRID_LINKAGE_KEY, parentLinkage)
if (parentActionEmit) provide(ACTION_EMIT_KEY, parentActionEmit)
if (parentFormApi) provide(FORM_GRID_API_KEY, parentFormApi)

function handleConfirm() {
  emit('confirm', { ...dialogFormData })
  emit('update:modelValue', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

// Forward container-drop from edit mode FormGrid
function handleContainerDrop(payload: { parentPath: number[]; index: number; dragDataRaw: string }) {
  emit('container-drop', payload)
}

// Children for edit mode: prefer explicit children prop, fallback to dialogSchema
const editChildren = computed(() => props.children ?? props.dialogSchema ?? [])

// Compute children count for preview badge
function childrenCount(): number {
  return editChildren.value.length
}
</script>

<template>
  <!--
    Edit mode: Show a compact preview card on the canvas.
    The actual dialog opens when editingDialogComponentId matches.
  -->
  <div v-if="editable" :class="$style.previewCard">
    <div :class="$style.previewHeader">
      <svg :class="$style.previewIcon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="12" height="10" rx="1.5" />
        <line x1="2" y1="6" x2="14" y2="6" />
        <circle cx="5" cy="4.5" r="0.5" fill="currentColor" />
        <circle cx="7.5" cy="4.5" r="0.5" fill="currentColor" />
      </svg>
      <span :class="$style.previewTitle">{{ title || 'Dialog' }}</span>
      <el-tag v-if="childrenCount() > 0" size="small" type="info" :class="$style.previewBadge">
        {{ childrenCount() }} 个子组件
      </el-tag>
      <el-tag v-else size="small" type="warning" :class="$style.previewBadge">
        空内容
      </el-tag>
    </div>
    <div :class="$style.previewHint">
      在右侧属性面板点击"编辑弹窗内容"来编辑
    </div>

    <!--
      Actual el-dialog: opens when editingDialogComponentId matches.
      Contains a mini-canvas with FormGrid for drag-drop editing.
    -->
    <el-dialog
      :model-value="localVisible"
      :title="`编辑弹窗: ${title || 'Dialog'}`"
      width="80%"
      :close-on-click-modal="false"
      :show-close="true"
      append-to-body
      :class="$style.editorDialog"
      @close="handleLocalClose"
    >
      <div :class="$style.editorBody">
        <FormGrid
          :schema="editChildren"
          :editable="true"
          :is-dragging="isDragging"
          @container-drop="handleContainerDrop"
        />
        <div v-if="editChildren.length === 0" :class="$style.editorEmpty">
          从左侧面板拖拽组件到此处构建弹窗内容
        </div>
      </div>
    </el-dialog>
  </div>

  <!--
    Preview/Runtime mode: render as actual el-dialog.
    Supports contentMode: 'edit' (default) and 'microapp'.
  -->
  <el-dialog
    v-else
    :model-value="modelValue"
    :title="title"
    :width="width"
    :fullscreen="fullscreen"
    :close-on-click-modal="closeOnClickModal ?? false"
    :show-close="true"
    append-to-body
    :class="$style.dialog"
    @close="handleLocalClose"
  >
    <!-- Microapp mode: iframe 加载已发布表单 -->
    <div v-if="contentMode === 'microapp'" :class="$style.microappContainer">
      <div v-if="microappLoading" :class="$style.microappLoading">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <span>加载表单中...</span>
      </div>
      <div v-if="microappError" :class="$style.microappError">
        <el-icon :size="24" color="#E50113"><CircleCloseFilled /></el-icon>
        <p>{{ microappError }}</p>
      </div>
      <iframe
        v-if="publishId && microappSrc"
        ref="microappIframeRef"
        :src="microappSrc"
        :class="$style.microappIframe"
        @load="handleMicroappIframeLoad"
      />
      <div v-if="!publishId" :class="$style.microappError">
        <p>未配置 publishId，无法加载微应用</p>
      </div>
    </div>

    <!-- Edit mode: render children via slot -->
    <div v-else :class="$style.dialogBody">
      <el-form :model="dialogFormData">
        <slot />
      </el-form>
    </div>

    <template v-if="showFooter" #footer>
      <slot name="footer">
        <el-button @click="handleCancel">{{ cancelText }}</el-button>
        <el-button
          type="primary"
          :loading="confirmLoading"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </el-button>
      </slot>
    </template>
  </el-dialog>
</template>

<style module lang="scss">
/* ---- Edit mode preview card ---- */
.previewCard {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px 16px;
  background: #fafbfc;
  transition: border-color 0.2s;

  &:hover {
    border-color: #c0c4cc;
  }
}

.previewHeader {
  display: flex;
  align-items: center;
  gap: 8px;
}

.previewIcon {
  flex-shrink: 0;
  color: #909399;
}

.previewTitle {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.previewBadge {
  margin-left: auto;
}

.previewHint {
  margin-top: 8px;
  font-size: 11px;
  color: #c0c4cc;
  line-height: 1.4;
}

/* ---- Edit mode dialog ---- */
.editorDialog {
  min-height: 400px;
}

.editorBody {
  min-height: 300px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  padding: 16px;
  position: relative;
}

.editorEmpty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 13px;
  pointer-events: none;
}

/* ---- Preview/Runtime dialog ---- */
.dialogBody {
  padding: 16px 0;
}

/* ---- Microapp mode ---- */
.microappContainer {
  position: relative;
  min-height: 200px;
}

.microappLoading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 0;
  color: #909399;
}

.microappError {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 0;
  color: #f56c6c;
  text-align: center;
}

.microappIframe {
  width: 100%;
  min-height: 400px;
  border: none;
}
</style>
