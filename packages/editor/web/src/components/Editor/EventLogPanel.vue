<script setup lang="ts">
/**
 * EventLogPanel — 事件执行日志面板
 *
 * 展示 useEventLog 捕获的事件/规则/API 执行日志。
 */
import { ref, nextTick, watch } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { useEventLog } from '../../composables/useEventLog'

const { entries, clear } = useEventLog()
const scrollRef = ref<HTMLElement | null>(null)

watch(() => entries.value.length, async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
})

const LEVEL_COLORS: Record<string, string> = {
  event: '#409eff',
  rule: '#9c27b0',
  api: '#67c23a',
  warn: '#e6a23c',
  error: '#f56c6c',
  info: '#909399',
  debug: '#c0c4cc',
}

const LEVEL_LABELS: Record<string, string> = {
  event: '事件',
  rule: '规则',
  api: 'API',
  warn: '警告',
  error: '错误',
  info: '信息',
  debug: '调试',
}
</script>

<template>
  <div :class="$style.panel">
    <div :class="$style.header">
      <span :class="$style.title">执行日志</span>
      <span :class="$style.count">{{ entries.length }}</span>
      <el-button
        :class="$style.clearBtn"
        type="danger"
        text
        size="small"
        :icon="Delete"
        @click="clear"
      >
        清空
      </el-button>
    </div>
    <div ref="scrollRef" :class="$style.scroll">
      <div v-if="entries.length === 0" :class="$style.empty">
        暂无日志
      </div>
      <div
        v-for="entry in entries"
        :key="entry.id"
        :class="$style.entry"
      >
        <span :class="$style.time">{{ entry.time }}</span>
        <span
          :class="$style.level"
          :style="{ color: LEVEL_COLORS[entry.level] || '#909399' }"
        >
          {{ LEVEL_LABELS[entry.level] || entry.level }}
        </span>
        <span :class="$style.scope">[{{ entry.scope }}]</span>
        <span :class="$style.message">{{ entry.message }}</span>
      </div>
    </div>
  </div>
</template>

<style module>
.panel {
  display: flex;
  flex-direction: column;
  height: 200px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.title {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}

.count {
  font-size: 11px;
  color: #c0c4cc;
  background: #f0f2f5;
  border-radius: 8px;
  padding: 0 6px;
  line-height: 18px;
}

.clearBtn {
  margin-left: auto;
}

.scroll {
  flex: 1;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
}

.empty {
  padding: 24px;
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
}

.entry {
  display: flex;
  gap: 6px;
  padding: 3px 12px;
  border-bottom: 1px solid #f5f7fa;
  line-height: 20px;
}

.entry:hover {
  background: #f5f7fa;
}

.time {
  color: #c0c4cc;
  flex-shrink: 0;
}

.level {
  font-weight: 600;
  flex-shrink: 0;
  min-width: 32px;
}

.scope {
  color: #909399;
  flex-shrink: 0;
}

.message {
  color: #303133;
  word-break: break-all;
}
</style>
