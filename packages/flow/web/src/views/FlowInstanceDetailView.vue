<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { useFlowInstanceStore, type FlowInstance, type TaskInstance } from '../stores/flowInstance.js'

const route = useRoute()
const store = useFlowInstanceStore()

const instanceId = computed(() => route.params.id as string)

onMounted(() => {
  store.fetchInstanceDetail(instanceId.value)
})

const instance = computed(() => store.currentInstance)

const statusType = computed(() => {
  const map: Record<string, string> = {
    running: 'primary',
    completed: 'success',
    terminated: 'danger',
    suspended: 'warning',
  }
  return map[instance.value?.status ?? ''] ?? 'info'
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    running: '运行中',
    completed: '已完成',
    terminated: '已终止',
    suspended: '已挂起',
  }
  return map[instance.value?.status ?? ''] ?? instance.value?.status ?? ''
})

const graphNodes = computed(() => {
  if (!instance.value?.tokens) return []
  return instance.value.tokens.map((token) => ({
    id: token.tokenId,
    type: token.nodeId.startsWith('end') ? 'output' : 'default',
    position: { x: 0, y: 0 },
    data: { label: token.nodeId },
  }))
})

const graphEdges = computed(() => {
  if (!instance.value?.tokens || instance.value.tokens.length < 2) return []
  const tokens = instance.value.tokens
  return tokens.slice(0, -1).map((token, idx) => ({
    id: `e-${token.tokenId}-${tokens[idx + 1].tokenId}`,
    source: token.tokenId,
    target: tokens[idx + 1].tokenId,
  }))
})

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}
</script>

<template>
  <div v-loading="store.loading" class="instance-detail">
    <div v-if="instance" class="content">
      <!-- Instance info header -->
      <div class="infoCard">
        <div class="infoRow">
          <span class="label">实例 ID</span>
          <span class="value mono">{{ instance.id }}</span>
        </div>
        <div class="infoRow">
          <span class="label">状态</span>
          <el-tag :type="statusType" size="small">{{ statusLabel }}</el-tag>
        </div>
        <div class="infoRow">
          <span class="label">发起人</span>
          <span class="value">{{ instance.initiatedBy || '-' }}</span>
        </div>
        <div class="infoRow">
          <span class="label">开始时间</span>
          <span class="value">{{ formatDate(instance.startedAt) }}</span>
        </div>
        <div class="infoRow">
          <span class="label">完成时间</span>
          <span class="value">{{ formatDate(instance.completedAt) }}</span>
        </div>
      </div>

      <!-- Flow graph -->
      <div class="sectionTitle">流程图</div>
      <div class="graphContainer">
        <VueFlow
          :nodes="graphNodes"
          :edges="graphEdges"
          fit-view-on-init
          class="flowGraph"
        >
          <Background />
        </VueFlow>
      </div>

      <!-- Variables -->
      <template v-if="instance.variables && Object.keys(instance.variables).length > 0">
        <div class="sectionTitle">流程变量</div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item
            v-for="(value, key) in instance.variables"
            :key="String(key)"
            :label="String(key)"
          >
            {{ String(value) }}
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <!-- Tokens / activity log -->
      <div class="sectionTitle">活动轨迹</div>
      <el-timeline>
        <el-timeline-item
          v-for="token in instance.tokens"
          :key="token.tokenId"
          :type="token.state === 'active' ? 'primary' : token.state === 'completed' ? 'success' : 'info'"
          :timestamp="formatDate(instance.updatedAt)"
          placement="top"
        >
          <span class="tokenNode">{{ token.nodeId }}</span>
          <el-tag size="small" :type="token.state === 'active' ? '' : 'info'" style="margin-left: 8px;">
            {{ token.state }}
          </el-tag>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<style scoped>
.instance-detail {
  padding: 24px;
}
.infoCard {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.infoRow {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.label {
  font-size: 12px;
  color: #909399;
}
.value {
  font-size: 14px;
  color: #303133;
}
.mono {
  font-family: monospace;
}
.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 24px 0 12px;
}
.graphContainer {
  background: #fff;
  border-radius: 8px;
  height: 400px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.flowGraph {
  width: 100%;
  height: 100%;
}
.tokenNode {
  font-family: monospace;
  font-size: 13px;
}
</style>
