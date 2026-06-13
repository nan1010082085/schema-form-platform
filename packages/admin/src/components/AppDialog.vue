<template>
  <t-dialog
    v-model:visible="visible"
    :header="title"
    :width="width"
    :destroy-on-close="destroyOnClose"
    @close="handleClose"
  >
    <slot />
    <template #footer>
      <slot name="footer">
        <t-button @click="handleCancel">取消</t-button>
        <t-button theme="primary" :loading="loading" @click="handleConfirm">确定</t-button>
      </slot>
    </template>
  </t-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  width?: string
  destroyOnClose?: boolean
  loading?: boolean
  confirmText?: string
  cancelText?: string
}>(), {
  width: '580px',
  destroyOnClose: true,
  loading: false,
  confirmText: '确定',
  cancelText: '取消',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'cancel': []
  'close': []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  visible.value = false
  emit('cancel')
}

function handleClose() {
  emit('close')
}
</script>
