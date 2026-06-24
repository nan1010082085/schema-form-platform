<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">调用记录</h3>
      <div :class="$style.filters">
        <el-select
          v-model="selectedAgent"
          placeholder="Agent"
          clearable
          size="small"
          @change="handleFilterChange"
        >
          <el-option label="Router" value="router" />
          <el-option label="Editor" value="editor" />
          <el-option label="Flow" value="flow" />
          <el-option label="Page" value="page" />
        </el-select>
        <el-select
          v-model="selectedStatus"
          placeholder="状态"
          clearable
          size="small"
          @change="handleFilterChange"
        >
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
        </el-select>
      </div>
    </div>

    <el-table :data="metrics" size="small" :class="$style.table">
      <el-table-column label="时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="Agent" width="100">
        <template #default="{ row }">
          <el-tag :type="agentTagType(row.agentName)" size="small">
            {{ row.agentName }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" prop="operation" width="120" />
      <el-table-column label="耗时" width="100">
        <template #default="{ row }">
          <span :class="durationClass(row.duration)">
            {{ formatDuration(row.duration) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="Token" width="80">
        <template #default="{ row }">
          {{ row.tokenUsage?.total ?? '-' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.success ? 'success' : 'danger'" size="small">
            {{ row.success ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="错误" min-width="200">
        <template #default="{ row }">
          <span v-if="row.error" :class="$style.error">{{ row.error }}</span>
          <span v-else class="text-secondary">-</span>
        </template>
      </el-table-column>
    </el-table>

    <div :class="$style.pagination">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { AgentMetric } from '@/types'

defineProps<{
  metrics: AgentMetric[]
  total: number
  currentPage: number
  pageSize: number
}>()

const emit = defineEmits<{
  filterChange: [agent?: string, status?: 'success' | 'failed']
  pageChange: [page: number]
}>()

const selectedAgent = ref<string | undefined>()
const selectedStatus = ref<'success' | 'failed' | undefined>()

function handleFilterChange(): void {
  emit('filterChange', selectedAgent.value, selectedStatus.value)
}

function handlePageChange(page: number): void {
  emit('pageChange', page)
}

function agentTagType(agent: string): '' | 'success' | 'warning' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'danger'> = {
    router: '',
    editor: '',
    flow: 'success',
    page: 'warning',
  }
  return map[agent] ?? ''
}

function durationClass(ms: number): string {
  if (ms <= 1000) return 'text-success'
  if (ms <= 3000) return 'text-warning'
  return 'text-danger'
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}
</script>

<style module>
.container {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.filters {
  display: flex;
  gap: 8px;
}

.table {
  width: 100%;
}

.error {
  color: var(--el-color-danger);
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

:global(.text-success) {
  color: var(--el-color-success);
}

:global(.text-warning) {
  color: var(--el-color-warning);
}

:global(.text-danger) {
  color: var(--el-color-danger);
}

:global(.text-secondary) {
  color: var(--el-text-color-secondary);
}
</style>
