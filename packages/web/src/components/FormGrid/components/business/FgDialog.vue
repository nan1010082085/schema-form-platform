<script setup lang="ts">
/**
 * FgDialog — Schema-aware dialog component.
 *
 * Renders dialogSchema via SchemaRender with scoped formData
 * isolated from the parent form. Supports initialData pre-fill
 * and returns formData on confirm.
 */
import { reactive, provide, inject, watch } from 'vue'
import SchemaRender from '../../SchemaRender.vue'
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
}>(), {
  width: '994px',
  showFooter: true,
  confirmText: '确定',
  cancelText: '取消',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: FormData]
  cancel: []
  close: []
}>()

// Isolated formData — re-init when initialData or dialog open changes
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

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}

function handleConfirm() {
  emit('confirm', { ...dialogFormData })
  emit('update:modelValue', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :fullscreen="fullscreen"
    :close-on-click-modal="closeOnClickModal ?? false"
    :show-close="true"
    append-to-body
    class="fg-dialog"
    @close="handleClose"
  >
    <div v-if="dialogSchema?.length" class="fg-dialog__body">
      <el-form :model="dialogFormData">
        <SchemaRender
          v-for="(item, idx) in dialogSchema"
          :key="idx"
          :schema="item"
          :form-data="dialogFormData"
          :path="[idx]"
        />
      </el-form>
    </div>
    <slot v-else />

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

<style scoped lang="scss">
.fg-dialog__body {
  padding: 16px 0;
}
</style>
