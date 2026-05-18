<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue?: string | Date
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  format?: string
  height?: string
  maxHeight?: string
  minHeight?: string
}>()

defineEmits<{
  'update:modelValue': [value: string | Date | undefined]
}>()

const styleObj = computed(() => ({
  width: '100%',
  height: props.height,
  maxHeight: props.maxHeight,
  minHeight: props.minHeight,
}))
</script>

<template>
  <div class="fg-date">
    <el-date-picker
      :model-value="modelValue"
      :placeholder="placeholder ?? '请选择日期'"
      :disabled="disabled"
      :readonly="readonly"
      type="date"
      :format="format ?? 'YYYY-MM-DD'"
      value-format="YYYY-MM-DD"
      :style="styleObj"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<style scoped lang="scss">
.fg-date {
  width: 100%;
  height: 100%;

  :deep(.el-date-editor) {
    height: 100%;

    .el-input__wrapper {
      height: 100%;
      box-sizing: border-box;
      box-shadow: none;
      border: none;
    }

    .el-input__inner {
      height: 100%;
    }
  }
}
</style>
