<template>
  <div :class="$style.container">
    <div v-if="loading" :class="$style.loading">
      <el-icon class="is-loading"><Loading /></el-icon>
    </div>

    <div v-else-if="logs.length === 0" :class="$style.empty">
      <span>暂无审批记录</span>
    </div>

    <div v-else :class="$style.timeline">
      <div
        v-for="log in logs"
        :key="log.id"
        :class="$style.logItem"
      >
        <div :class="$style.logHeader">
          <el-tag :type="actionType(log.action)" size="small">
            {{ actionLabel(log.action) }}
          </el-tag>
          <span :class="$style.nodeName">{{ log.nodeName }}</span>
        </div>
        <div :class="$style.logContent">
          <span :class="$style.operator">{{ log.operator }}</span>
          <span v-if="log.comment" :class="$style.comment">{{ log.comment }}</span>
        </div>
        <div :class="$style.logTime">
          {{ formatTime(log.createdAt) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { flowApi } from '../../api/flowApi'

const route = useRoute()
const instanceId = computed(() => route.query.instanceId as string)

const loading = ref(false)
const logs = ref<any[]>([])

async function loadLogs() {
  if (!instanceId.value) return

  loading.value = true
  try {
    const res = await flowApi.getApprovalLogs(instanceId.value)
    logs.value = res.items ?? res as unknown as any[]
  } catch (err) {
    console.error('Failed to load approval logs:', err)
  } finally {
    loading.value = false
  }
}

function actionType(action: string): '' | 'success' | 'danger' | 'warning' {
  const map: Record<string, '' | 'success' | 'danger' | 'warning'> = {
    approve: 'success',
    reject: 'danger',
    claim: '',
    delegate: 'warning',
    comment: '',
  }
  return map[action] ?? ''
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    approve: '通过',
    reject: '驳回',
    claim: '认领',
    delegate: '委派',
    comment: '评论',
  }
  return map[action] ?? action
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN')
}

watch(instanceId, loadLogs, { immediate: true })
</script>

<style module>
.container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.logItem {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.logHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.nodeName {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.logContent {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.operator {
  font-weight: 500;
}

.comment {
  color: var(--el-text-color-secondary);
}

.logTime {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}
</style>
