<script setup lang="ts">
/**
 * FormRichText — 富文本编辑器组件
 * 基于 textarea 封装，预留扩展为完整富文本的能力
 */
import { computed } from 'vue'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  rows?: number
  maxLength?: number
  height?: string
  maxHeight?: string
  minHeight?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const styleObj = computed(() => ({
  width: '100%',
  height: props.height,
  maxHeight: props.maxHeight,
  minHeight: props.minHeight,
}))
</script>

<template>
  <el-input
    :model-value="modelValue ?? ''"
    type="textarea"
    :rows="rows ?? 6"
    :placeholder="placeholder ?? '请输入内容'"
    :disabled="disabled"
    :readonly="readonly"
    :maxlength="maxLength"
    show-word-limit
    resize="vertical"
    :style="styleObj"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
