<script setup lang="ts">
import { computed } from 'vue'
import { useDynamicOptions } from '@/composables/useDynamicOptions'
import type { SchemaApiConfig, DictItem, FormFieldValue } from '../../types'

const props = defineProps<{
  modelValue?: FormFieldValue
  disabled?: boolean
  api?: SchemaApiConfig
  options?: DictItem[]
  height?: string
  maxHeight?: string
  minHeight?: string
}>()

defineEmits<{
  'update:modelValue': [value: FormFieldValue]
}>()

const { options: dynamicOptions } = useDynamicOptions(() => props.api)

const mergedOptions = computed(() =>
  dynamicOptions.value.length > 0 ? dynamicOptions.value : (props.options ?? []),
)

const styleObj = computed(() => ({
  height: props.height,
  maxHeight: props.maxHeight,
  minHeight: props.minHeight,
}))
</script>

<template>
  <el-radio-group
    :model-value="modelValue"
    :disabled="disabled"
    :style="styleObj"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-radio v-for="opt in mergedOptions" :key="opt.value" :value="opt.value">
      {{ opt.label }}
    </el-radio>
  </el-radio-group>
</template>
