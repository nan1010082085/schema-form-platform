<script setup lang="ts">
/**
 * FgDialog -- Schema-aware dialog component.
 *
 * Supports two modes:
 * - Edit mode (editable=true): Shows a compact preview card on the canvas.
 *   The actual dialog opens via the editor store (editingDialogComponentId)
 *   and renders a mini-canvas with drag-drop support for editing children.
 * - Preview/Runtime mode: Renders normally as an el-dialog with
 *   dialogSchema rendered via SchemaRender.
 */
import { reactive, provide, inject, watch, ref, computed } from 'vue'
import FormGrid from '@/components/FormGrid/index.vue'
import { useEditorStore } from '@/stores/editor'
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
}>(), {
  width: '600px',
  showFooter: true,
  confirmText: '确定',
  cancelText: '取消',
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

// ---- Local dialog visibility (edit mode manages its own open/close) ----
const localVisible = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  localVisible.value = val
})

// Auto-open when editor store targets this dialog
watch(() => editorStore.editingDialogComponentId, (id) => {
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
    Children are rendered via slot (provided by SchemaRender).
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
    <div :class="$style.dialogBody">
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
</style>
