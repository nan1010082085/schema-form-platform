<template>
  <AppDialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :loading="loading"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="handleConfirm"
  >
    <div :class="$style.content">
      <InfoCircleFilledIcon v-if="type === 'warning'" :class="$style.icon" :style="{ color: 'var(--td-warning-color)' }" />
      <ErrorCircleFilledIcon v-else-if="type === 'danger'" :class="$style.icon" :style="{ color: 'var(--td-error-color)' }" />
      <InfoCircleFilledIcon v-else :class="$style.icon" :style="{ color: 'var(--td-brand-color)' }" />
      <p :class="$style.message">{{ message }}</p>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { InfoCircleFilledIcon, ErrorCircleFilledIcon } from 'tdesign-icons-vue-next'
import AppDialog from './AppDialog.vue'

withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  width?: string
  loading?: boolean
  message: string
  type?: 'info' | 'warning' | 'danger'
}>(), {
  title: '确认操作',
  width: '400px',
  loading: false,
  type: 'warning',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

function handleConfirm() {
  emit('confirm')
}
</script>

<style module>
.content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.icon {
  font-size: 24px;
  flex-shrink: 0;
}

.message {
  margin: 0;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
}
</style>
