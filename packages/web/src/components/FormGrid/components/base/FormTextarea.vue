<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  rows?: number
  autosize?: boolean | { minRows?: number; maxRows?: number }
  height?: string
  maxHeight?: string
  minHeight?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const styleObj = computed(() => ({
  height: props.height,
  maxHeight: props.maxHeight,
  minHeight: props.minHeight,
}))
</script>

<template>
  <el-input
    type="textarea"
    :model-value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :rows="rows ?? 3"
    :autosize="autosize"
    :style="styleObj"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
