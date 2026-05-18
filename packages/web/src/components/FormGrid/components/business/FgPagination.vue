<script setup lang="ts">
/**
 * FgPagination — 分页组件
 * 对齐 UI 规范：字号 16px，上边距 24px
 */
defineProps<{
  currentPage: number
  pageSize: number
  total: number
  pageSizes?: number[]
}>()

const emit = defineEmits<{
  'update:currentPage': [page: number]
  'update:pageSize': [size: number]
  'change': [page: number]
  'sizeChange': [size: number]
}>()

function handleCurrentChange(page: number) {
  emit('update:currentPage', page)
  emit('change', page)
}

function handleSizeChange(size: number) {
  emit('update:pageSize', size)
  emit('sizeChange', size)
}
</script>

<template>
  <el-pagination
    class="fg-pagination"
    :current-page="currentPage"
    :page-size="pageSize"
    :total="total"
    :page-sizes="pageSizes ?? [10, 20, 30, 40, 50]"
    layout="total, sizes, prev, pager, next, jumper"
    @current-change="handleCurrentChange"
    @size-change="handleSizeChange"
  />
</template>
