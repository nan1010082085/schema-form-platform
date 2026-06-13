<template>
  <AppDialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :loading="loading"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  >
    <t-form
      ref="formRef"
      :data="formData"
      :rules="rules"
      :label-width="labelWidth"
    >
      <slot :form="formData" />
    </t-form>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FormInstanceFunctions, FormRules } from 'tdesign-vue-next'
import AppDialog from './AppDialog.vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  width?: string
  loading?: boolean
  labelWidth?: string
  formData: Record<string, unknown>
  rules?: FormRules
}>(), {
  width: '500px',
  loading: false,
  labelWidth: '100px',
  rules: () => ({}),
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [data: Record<string, unknown>]
  cancel: []
}>()

const formRef = ref<FormInstanceFunctions>()

async function handleConfirm() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    emit('submit', { ...props.formData })
  } catch {
    // Validation failed
  }
}

function handleCancel() {
  emit('cancel')
}

watch(() => props.modelValue, (visible) => {
  if (visible) {
    formRef.value?.clearValidate()
  }
})
</script>
