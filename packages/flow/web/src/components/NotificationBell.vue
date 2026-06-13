<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { NotificationIcon } from 'tdesign-icons-vue-next'
import { useNotificationStore } from '../stores/notification.js'
import styles from './NotificationBell.module.scss'

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
  <t-popup
    placement="bottom-right"
    :overlay-style="{ width: '360px' }"
    trigger="click"
    @visible-change="(visible: boolean) => { if (visible) handleOpen() }"
  >
    <template #content>
      <div :class="styles.header">
        <span :class="styles.title">通知</span>
        <t-button
          v-if="store.unreadCount > 0"
          theme="primary"
          variant="text"
          size="small"
          @click="store.markAllAsRead()"
        >
          全部已读
        </t-button>
      </div>

      <div :class="styles.list" v-loading="store.loading">
        <template v-if="store.notifications.length > 0">
          <div
            v-for="item in store.notifications"
            :key="item.id"
            :class="[styles.item, { [styles.itemUnread]: !item.isRead }]"
          >
            <div :class="styles.itemHeader">
              <t-tag :theme="notificationTypeTag(item.type).theme as any" size="small" variant="light">
                {{ notificationTypeTag(item.type).label }}
              </t-tag>
              <span :class="styles.itemTime">{{ formatTime(item.createdAt) }}</span>
            </div>
            <div :class="styles.itemTitle">{{ item.title }}</div>
            <div v-if="item.content" :class="styles.itemContent">{{ item.content }}</div>
            <div v-if="!item.isRead" :class="styles.itemActions">
              <t-button theme="primary" variant="text" size="small" @click="store.markAsRead(item.id)">
                标为已读
              </t-button>
            </div>
          </div>
        </template>
        <t-empty v-else description="暂无通知" />
      </div>
    </template>

    <t-badge :count="store.unreadCount" :hidden="store.unreadCount === 0" :max-count="99">
      <NotificationIcon :size="20" :class="styles.bellIcon" />
    </t-badge>
  </t-popup>
</template>
