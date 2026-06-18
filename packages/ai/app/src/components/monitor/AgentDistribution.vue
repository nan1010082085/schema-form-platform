<template>
  <div :class="$style.container">
    <h3 :class="$style.title">Agent 分布</h3>
    <div :class="$style.bars">
      <div
        v-for="item in distribution"
        :key="item.agent"
        :class="$style.bar"
      >
        <div :class="$style.barHeader">
          <span :class="$style.agentName">{{ agentLabels[item.agent] ?? item.agent }}</span>
          <span :class="$style.agentStats">
            {{ item.percentage }}% ({{ item.count }})
          </span>
        </div>
        <div :class="$style.barTrack">
          <div
            :class="$style.barFill"
            :style="{ width: `${item.percentage}%`, backgroundColor: agentColors[item.agent] }"
          />
        </div>
        <div :class="$style.barFooter">
          <span>成功率 {{ item.successRate.toFixed(1) }}%</span>
          <span>平均 {{ formatDuration(item.avgDuration) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface DistributionItem {
  agent: string
  count: number
  percentage: number
  successRate: number
  avgDuration: number
}

defineProps<{
  distribution: DistributionItem[]
}>()

const agentLabels: Record<string, string> = {
  router: 'Router 路由',
  editor: 'Editor 表单',
  flow: 'Flow 流程',
  page: 'Page 页面',
  general: 'General 通用',
}

const agentColors: Record<string, string> = {
  router: '#8b5cf6',
  editor: '#3b82f6',
  flow: '#10b981',
  page: '#f59e0b',
  general: '#6b7280',
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

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.barHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.agentName {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.agentStats {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.barTrack {
  height: 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.barFill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.barFooter {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
