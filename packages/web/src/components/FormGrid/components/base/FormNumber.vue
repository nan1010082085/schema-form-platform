<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue?: number
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  min?: number
  max?: number
  height?: string
  maxHeight?: string
  minHeight?: string
}>()

defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()

const styleObj = computed(() => ({
  width: '100%',
  height: props.height,
  maxHeight: props.maxHeight,
  minHeight: props.minHeight,
}))
</script>

<template>
  <el-input-number
    :model-value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :min="min"
    :max="max"
    controls-position="right"
    :style="styleObj"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
