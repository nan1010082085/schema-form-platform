<template>
  <div :class="$style.summary">
    <div :class="$style.card">
      <div :class="$style.label">总调用</div>
      <div :class="$style.value">{{ formatNumber(summary?.totalCalls ?? 0) }}</div>
    </div>
    <div :class="$style.card">
      <div :class="$style.label">成功率</div>
      <div :class="[$style.value, successRateClass]">
        {{ formatPercent(summary?.successRate ?? 0) }}
      </div>
    </div>
    <div :class="$style.card">
      <div :class="$style.label">平均耗时</div>
      <div :class="[$style.value, durationClass]">
        {{ formatDuration(summary?.avgDuration ?? 0) }}
      </div>
    </div>
    <div :class="$style.card">
      <div :class="$style.label">Token 用量</div>
      <div :class="$style.value">{{ formatTokens(summary?.totalTokens ?? 0) }}</div>
    </div>
    <div :class="$style.card">
      <div :class="$style.label">慢调用</div>
      <div :class="[$style.value, slowCallsClass]">
        {{ summary?.slowCalls ?? 0 }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MonitorSummary } from '@/types'

const props = defineProps<{
  summary: MonitorSummary | null
}>()

const successRateClass = computed(() => {
  const rate = props.summary?.successRate ?? 0
  if (rate >= 95) return 'text-success'
  if (rate >= 90) return 'text-warning'
  return 'text-danger'
})

const durationClass = computed(() => {
  const duration = props.summary?.avgDuration ?? 0
  if (duration <= 1000) return 'text-success'
  if (duration <= 3000) return 'text-warning'
  return 'text-danger'
})

const slowCallsClass = computed(() => {
  const slow = props.summary?.slowCalls ?? 0
  if (slow === 0) return 'text-success'
  if (slow <= 5) return 'text-warning'
  return 'text-danger'
})

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}
</script>

<style module>
.summary {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
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
</style>
