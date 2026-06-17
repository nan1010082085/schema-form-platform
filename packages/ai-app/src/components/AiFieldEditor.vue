<script setup lang="ts">
/**
 * 字段编辑弹窗
 *
 * 支持编辑字段的标签、占位符、验证规则等属性。
 */

import { ref, watch, computed } from 'vue'
import type { EditContext } from '@/composables/usePreviewInteraction'

export interface AiFieldEditorProps {
  visible: boolean
  context: EditContext | null
}

const props = defineProps<AiFieldEditorProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [id: string, data: Record<string, unknown>]
  cancel: []
}>()

// ---- 编辑表单数据 ----

const formData = ref<Record<string, unknown>>({})

watch(
  () => props.context,
  (ctx) => {
    if (ctx) {
      formData.value = { ...ctx.data }
    }
  },
  { immediate: true },
)

// ---- 表单字段定义 ----

interface FormField {
  key: string
  label: string
  type: 'input' | 'select' | 'switch'
  options?: Array<{ label: string; value: string }>
  placeholder?: string
}

const formFields = computed<FormField[]>(() => {
  if (!props.context) return []

  const baseFields: FormField[] = [
    { key: 'label', label: '标签', type: 'input', placeholder: '请输入标签' },
  ]

  if (props.context.type === 'field') {
    baseFields.push(
      { key: 'field', label: '字段名', type: 'input', placeholder: '请输入字段名' },
      { key: 'placeholder', label: '占位符', type: 'input', placeholder: '请输入占位符' },
      { key: 'required', label: '必填', type: 'switch' },
    )
  }

  if (props.context.type === 'node') {
    baseFields.push(
      { key: 'description', label: '描述', type: 'input', placeholder: '请输入描述' },
    )
  }

  return baseFields
})

// ---- 操作 ----

function handleSave() {
  if (!props.context) return
  emit('save', props.context.id, { ...formData.value })
  handleClose()
}

function handleClose() {
  emit('update:visible', false)
  emit('cancel')
}

function handleCancel() {
  handleClose()
}
</script>

<template>
  <t-dialog
    :visible="visible"
    header="编辑属性"
    width="400px"
    :close-on-overlay-click="false"
    @close="handleClose"
  >
    <div v-if="context" :class="$style.editor">
      <t-form label-align="top" size="medium">
        <t-form-item
          v-for="field in formFields"
          :key="field.key"
          :label="field.label"
        >
          <!-- Input -->
          <t-input
            v-if="field.type === 'input'"
            v-model:value="formData[field.key]"
            :placeholder="field.placeholder"
          />

          <!-- Select -->
          <t-select
            v-else-if="field.type === 'select'"
            v-model:value="formData[field.key]"
            placeholder="请选择"
            style="width: 100%"
            :options="field.options"
          />

          <!-- Switch -->
          <t-switch
            v-else-if="field.type === 'switch'"
            v-model:value="formData[field.key]"
          />
        </t-form-item>
      </t-form>

      <!-- 类型信息 -->
      <div :class="$style.typeInfo">
        <span :class="$style.typeLabel">类型：</span>
        <span :class="$style.typeValue">{{ context.data.type }}</span>
      </div>
    </div>

    <template #footer>
      <div :class="$style.footer">
        <t-button @click="handleCancel">取消</t-button>
        <t-button theme="primary" @click="handleSave">保存</t-button>
      </div>
    </template>
  </t-dialog>
</template>

<style module>
.editor {
  padding: 8px 0;
}

.typeInfo {
  margin-top: 16px;
  padding: 12px;
  background: var(--ai-bg-gray, #F5F7FA);
  border-radius: var(--ai-radius-md, 4px);
  display: flex;
  align-items: center;
  gap: 8px;
}

.typeLabel {
  font-size: 12px;
  color: var(--ai-text-secondary, #666666);
}

.typeValue {
  font-size: 12px;
  color: var(--ai-text-primary, #333333);
  font-family: Consolas, Monaco, monospace;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
