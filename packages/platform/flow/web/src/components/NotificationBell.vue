<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '../stores/notification.js'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

const store = useNotificationStore()

let pollTimer: ReturnType<typeof setInterval> | null = null

function notificationTypeTag(type: string) {
  const map: Record<string, { label: string; theme: string }> = {
    task_created: { label: '新任务', theme: 'primary' },
    task_timeout: { label: '即将超时', theme: 'warning' },
    task_completed: { label: '已完成', theme: 'success' },
    task_delegated: { label: '已委派', theme: 'default' },
  }
  return map[type] ?? { label: type, theme: 'default' }
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN')
}

function handleOpen() {
  store.fetchNotifications()
}

onMounted(() => {
  store.fetchUnreadCount()
  pollTimer = setInterval(() => store.fetchUnreadCount(), 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <el-popover
    placement="bottom"
    :width="360"
    trigger="click"
    @show="handleOpen"
  >
    <template #reference>
      <el-badge :value="store.unreadCount" :hidden="store.unreadCount === 0" :max="99">
        <AppIcon name="bell" :size="14" />
      </el-badge>
    </template>

    <div class="notification-header">
      <span class="notification-title">通知</span>
      <el-button
        v-if="store.unreadCount > 0"
        type="primary"
        link
        size="small"
        @click="store.markAllAsRead()"
      >
        全部已读
      </el-button>
    </div>

    <div class="notification-list" v-loading="store.loading">
      <template v-if="store.notifications.length > 0">
        <div
          v-for="item in store.notifications"
          :key="item.id"
          :class="['notification-item', { 'notification-item--unread': !item.isRead }]"
        >
          <div class="notification-item-header">
            <el-tag :type="notificationTypeTag(item.type).theme as any" size="small" effect="light">
              {{ notificationTypeTag(item.type).label }}
            </el-tag>
            <span class="notification-item-time">{{ formatTime(item.createdAt) }}</span>
          </div>
          <div class="notification-item-title">{{ item.title }}</div>
          <div v-if="item.content" class="notification-item-content">{{ item.content }}</div>
          <div v-if="!item.isRead" class="notification-item-actions">
            <el-button type="primary" link size="small" @click="store.markAsRead(item.id)">
              标为已读
            </el-button>
          </div>
        </div>
      </template>
      <el-empty v-else description="暂无通知" />
    </div>
  </el-popover>
</template>

<style scoped>
.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color-lighter);
  margin-bottom: 8px;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color-primary);
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: var(--bg-color-secondary);
}

.notification-item--unread {
  background-color: var(--color-primary-lighter);
}

.notification-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.notification-item-time {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.notification-item-title {
  font-size: 13px;
  color: var(--text-color-primary);
  margin-bottom: 4px;
}

.notification-item-content {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-bottom: 4px;
}

.notification-item-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
