<script setup lang="ts">
/**
 * FgTransfer — 穿梭框组件
 * 基于 el-transfer 封装，支持搜索过滤
 */
interface TransferItem {
  key: string | number
  label: string
  disabled?: boolean
}

defineProps<{
  modelValue: Array<string | number>
  data: TransferItem[]
  titles?: [string, string]
  filterable?: boolean
  filterPlaceholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Array<string | number>]
  'change': [value: Array<string | number>]
}>()

function handleChange(val: Array<string | number>) {
  emit('update:modelValue', val)
  emit('change', val)
}
</script>

<template>
  <el-transfer
    class="fg-transfer"
    :model-value="modelValue"
    :data="data"
    :titles="titles ?? ['待选', '已选']"
    :filterable="filterable ?? true"
    :filter-placeholder="filterPlaceholder ?? '请输入搜索内容'"
    @change="handleChange"
  />
</template>
