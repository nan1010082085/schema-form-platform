<script setup lang="ts">
import { computed } from 'vue'
import { useDynamicOptions } from '@/composables/useDynamicOptions'
import type { SchemaApiConfig, DictItem, FormFieldValue } from '../../types'

const props = defineProps<{
  modelValue?: FormFieldValue
  placeholder?: string
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

const { options: dynamicOptions, loading } = useDynamicOptions(() => props.api)

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
  <el-select
    :model-value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :loading="loading"
    :style="styleObj"
    class="fg-select"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-option
      v-for="opt in mergedOptions"
      :key="opt.value"
      :label="opt.label"
      :value="opt.value"
    />
  </el-select>
</template>

<style scoped lang="scss">
.fg-select {
  width: 100%;
  height: 100%;

  :deep(.el-select__wrapper) {
    height: 100%;
  }

  :deep(.el-input) {
    height: 100%;

    .el-input__wrapper {
      height: 100%;
      box-sizing: border-box;
    }

    .el-input__inner {
      height: 100%;
    }
  }
}
</style>
