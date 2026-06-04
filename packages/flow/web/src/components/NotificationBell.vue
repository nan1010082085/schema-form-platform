<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { Bell } from '@element-plus/icons-vue'
import { ElBadge, ElPopover, ElButton, ElEmpty, ElTag, ElIcon } from 'element-plus'
import { useNotificationStore } from '../stores/notification.js'
import styles from './NotificationBell.module.scss'

const store = useNotificationStore()

let pollTimer: ReturnType<typeof setInterval> | null = null

function notificationTypeTag(type: string) {
  const map: Record<string, { label: string; type: string }> = {
    task_created: { label: '新任务', type: 'primary' },
    task_timeout: { label: '即将超时', type: 'warning' },
    task_completed: { label: '已完成', type: 'success' },
    task_delegated: { label: '已委派', type: 'info' },
  }
  return map[type] ?? { label: type, type: 'info' }
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
    placement="bottom-end"
    :width="360"
    trigger="click"
    @show="handleOpen"
  >
    <template #reference>
      <el-badge :value="store.unreadCount" :hidden="store.unreadCount === 0" :max="99">
        <el-icon :size="20" :class="styles.bellIcon">
          <Bell />
        </el-icon>
      </el-badge>
    </template>

    <div :class="styles.header">
      <span :class="styles.title">通知</span>
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

    <div :class="styles.list" v-loading="store.loading">
      <template v-if="store.notifications.length > 0">
        <div
          v-for="item in store.notifications"
          :key="item.id"
          :class="[styles.item, { [styles.itemUnread]: !item.isRead }]"
        >
          <div :class="styles.itemHeader">
            <el-tag :type="notificationTypeTag(item.type).type as any" size="small" effect="plain">
              {{ notificationTypeTag(item.type).label }}
            </el-tag>
            <span :class="styles.itemTime">{{ formatTime(item.createdAt) }}</span>
          </div>
          <div :class="styles.itemTitle">{{ item.title }}</div>
          <div v-if="item.content" :class="styles.itemContent">{{ item.content }}</div>
          <div v-if="!item.isRead" :class="styles.itemActions">
            <el-button type="primary" link size="small" @click="store.markAsRead(item.id)">
              标为已读
            </el-button>
          </div>
        </div>
      </template>
      <el-empty v-else description="暂无通知" :image-size="60" />
    </div>
  </el-popover>
</template>
