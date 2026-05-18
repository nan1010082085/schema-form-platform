<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
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
    :model-value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :style="styleObj"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
