<script setup lang="ts">
/**
 * EventLogPanel — 事件执行日志面板
 *
 * 展示 useEventLog 捕获的事件/规则/API 执行日志。
 */
import { ref, nextTick, watch } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { useEventLog } from '../../composables/useEventLog'
import styles from './EventLogPanel.module.scss'

const { entries, clear } = useEventLog()
const scrollRef = ref<HTMLElement | null>(null)

watch(() => entries.value.length, async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
})

const LEVEL_COLORS: Record<string, string> = {
  event: '#0060A2',
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
  <div :class="styles.panel">
    <div :class="styles.header">
      <span :class="styles.title">执行日志</span>
      <span :class="styles.count">{{ entries.length }}</span>
      <el-button
        :class="styles.clearBtn"
        type="danger"
        text
        size="small"
        :icon="Delete"
        @click="clear"
      >
        清空
      </el-button>
    </div>
    <div ref="scrollRef" :class="styles.scroll">
      <div v-if="entries.length === 0" :class="styles.empty">
        暂无日志
      </div>
      <div
        v-for="entry in entries"
        :key="entry.id"
        :class="styles.entry"
      >
        <span :class="styles.time">{{ entry.time }}</span>
        <span
          :class="styles.level"
          :style="{ color: LEVEL_COLORS[entry.level] || 'var(--text-color-muted)' }"
        >
          {{ LEVEL_LABELS[entry.level] || entry.level }}
        </span>
        <span :class="styles.scope">[{{ entry.scope }}]</span>
        <span :class="styles.message">{{ entry.message }}</span>
      </div>
    </div>
  </div>
</template>
