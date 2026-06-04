<script setup lang="ts">
import { ref } from 'vue'
import { Bell, CircleCheck, InfoFilled } from '@element-plus/icons-vue'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'update' | 'feature'
  time: string
  read: boolean
}

const announcements = ref<Announcement[]>([
  {
    id: '1',
    title: 'v2.0 正式发布',
    content: '全新 AI 助手上线，支持对话式生成表单 Schema 和流程定义，大幅提升设计效率。',
    type: 'feature',
    time: '2 小时前',
    read: false,
  },
  {
    id: '2',
    title: '流程引擎优化',
    content: 'BPMN 流程设计器性能优化 30%，新增条件分支和并行网关支持。',
    type: 'update',
    time: '1 天前',
    read: false,
  },
  {
    id: '3',
    title: '系统维护通知',
    content: '本周六凌晨 2:00-4:00 进行系统维护，届时服务可能短暂不可用。',
    type: 'info',
    time: '3 天前',
    read: true,
  },
])

const typeConfig: Record<Announcement['type'], { label: string; color: string; icon: typeof InfoFilled }> = {
  info: { label: '通知', color: '#909399', icon: InfoFilled },
  update: { label: '更新', color: '#E6A23C', icon: Bell },
  feature: { label: '新功能', color: '#67C23A', icon: CircleCheck },
}

function markAsRead(id: string) {
  const item = announcements.value.find((a) => a.id === id)
  if (item) {
    item.read = true
  }
}

function markAllRead() {
  announcements.value.forEach((a) => {
    a.read = true
  })
}

const unreadCount = () => announcements.value.filter((a) => !a.read).length
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <div :class="$style.headerLeft">
        <h3 :class="$style.title">系统公告</h3>
        <el-badge v-if="unreadCount() > 0" :value="unreadCount()" :class="$style.badge" />
      </div>
      <el-button
        v-if="unreadCount() > 0"
        type="primary"
        link
        size="small"
        @click="markAllRead"
      >
        全部已读
      </el-button>
    </div>

    <div :class="$style.list">
      <div
        v-for="item in announcements"
        :key="item.id"
        :class="[$style.item, { [$style.itemRead]: item.read }]"
        @click="markAsRead(item.id)"
      >
        <div :class="$style.itemHeader">
          <el-tag
            :type="item.type === 'info' ? 'info' : item.type === 'update' ? 'warning' : 'success'"
            size="small"
            :class="$style.typeTag"
          >
            {{ typeConfig[item.type].label }}
          </el-tag>
          <span :class="$style.itemTime">{{ item.time }}</span>
        </div>
        <h4 :class="$style.itemTitle">{{ item.title }}</h4>
        <p :class="$style.itemContent">{{ item.content }}</p>
        <div v-if="!item.read" :class="$style.unreadDot"></div>
      </div>
    </div>
  </div>
</template>

<style module>
.container {
  width: 100%;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.badge {
  margin-left: 4px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  position: relative;
  padding: 16px;
  background: var(--bg-color-white);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 96, 162, 0.06);
}

.itemRead {
  opacity: 0.7;
}

.itemRead:hover {
  opacity: 1;
}

.itemHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.typeTag {
  font-size: 11px;
}

.itemTime {
  font-size: 12px;
  color: var(--text-color-placeholder);
}

.itemTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 6px;
}

.itemContent {
  font-size: 13px;
  color: var(--text-color-secondary);
  line-height: 1.5;
  margin: 0;
}

.unreadDot {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 8px;
  height: 8px;
  background: var(--color-danger);
  border-radius: 50%;
}
</style>
