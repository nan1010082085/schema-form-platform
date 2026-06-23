<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">
        告警
        <el-badge v-if="alerts.length > 0" :value="alerts.length" :class="$style.badge" />
      </h3>
    </div>

    <div v-if="alerts.length === 0" :class="$style.empty">
      <el-icon :size="24"><CircleCheck /></el-icon>
      <span>暂无告警</span>
    </div>

    <div v-else :class="$style.list">
      <div
        v-for="alert in alerts"
        :key="alert.id"
        :class="[$style.item, $style[alert.alertType]]"
      >
        <div :class="$style.icon">
          <el-icon v-if="alert.alertType === 'failure'" :size="16"><CircleClose /></el-icon>
          <el-icon v-else-if="alert.alertType === 'slow'" :size="16"><Warning /></el-icon>
          <el-icon v-else :size="16"><InfoFilled /></el-icon>
        </div>
        <div :class="$style.content">
          <div :class="$style.message">
            <span :class="$style.agent">{{ alert.agentName }}</span>
            <span :class="$style.operation">{{ alert.operation }}</span>
            <span v-if="alert.alertType === 'failure'" :class="$style.detail">
              失败: {{ alert.error ?? '未知错误' }}
            </span>
            <span v-else-if="alert.alertType === 'slow'" :class="$style.detail">
              耗时 {{ formatDuration(alert.duration) }} 超过阈值
            </span>
            <span v-else :class="$style.detail">
              Token 用量 {{ alert.tokenUsage?.total ?? 0 }} 超过阈值
            </span>
          </div>
          <div :class="$style.time">{{ formatTime(alert.createdAt) }}</div>
        </div>
      </div>
    </div>

    <div v-if="total > pageSize" :class="$style.pagination">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        small
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleCheck, CircleClose, Warning, InfoFilled } from '@element-plus/icons-vue'
import type { AgentAlert } from '@/types'

defineProps<{
  alerts: AgentAlert[]
  total: number
  currentPage: number
  pageSize: number
}>()

const emit = defineEmits<{
  pageChange: [page: number]
}>()

function handlePageChange(page: number): void {
  emit('pageChange', page)
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  margin-left: 4px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: var(--el-text-color-secondary);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid;
}

.failure {
  background: var(--el-color-danger-light-9);
  border-left-color: var(--el-color-danger);
}

.slow {
  background: var(--el-color-warning-light-9);
  border-left-color: var(--el-color-warning);
}

.high_token {
  background: var(--el-color-info-light-9);
  border-left-color: var(--el-color-info);
}

.icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.failure .icon {
  color: var(--el-color-danger);
}

.slow .icon {
  color: var(--el-color-warning);
}

.high_token .icon {
  color: var(--el-color-info);
}

.content {
  flex: 1;
  min-width: 0;
}

.message {
  font-size: 13px;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.agent {
  font-weight: 600;
}

.operation {
  color: var(--el-text-color-secondary);
}

.detail {
  color: var(--el-text-color-regular);
}

.time {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
