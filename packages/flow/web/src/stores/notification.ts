import { defineStore } from 'pinia'
import { ref } from 'vue'
import { flowApi } from '../api/flowApi.js'
import { connect, identify, onFlowNotification } from '@schema-form/socket'
import type { FlowNotificationEvent } from '@schema-form/socket'

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  content?: string
  relatedId?: string
  relatedType?: string
  isRead: boolean
  createdAt: string
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const total = ref(0)
  const loading = ref(false)

  let socketCleanup: (() => void) | null = null

  async function fetchUnreadCount() {
    try {
      const data = await flowApi.getUnreadCount()
      unreadCount.value = data.count
    } catch {
      // Silent fail for background polling
    }
  }

  async function fetchNotifications(page = 1, pageSize = 20, unreadOnly = false) {
    loading.value = true
    try {
      const data = await flowApi.getNotifications(page, pageSize, unreadOnly)
      notifications.value = data.items
      total.value = data.total
      unreadCount.value = data.unreadCount
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(id: string) {
    await flowApi.markNotificationAsRead(id)
    const item = notifications.value.find((n) => n.id === id)
    if (item && !item.isRead) {
      item.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  async function markBatchAsRead(ids: string[]) {
    const result = await flowApi.markNotificationsBatchRead(ids)
    for (const id of ids) {
      const item = notifications.value.find((n) => n.id === id)
      if (item && !item.isRead) {
        item.isRead = true
      }
    }
    unreadCount.value = Math.max(0, unreadCount.value - result.modifiedCount)
  }

  async function markAllAsRead() {
    await flowApi.markAllNotificationsAsRead()
    notifications.value.forEach((n) => { n.isRead = true })
    unreadCount.value = 0
  }

  function handleNewNotification(data: FlowNotificationEvent) {
    // Increment unread count
    unreadCount.value++
    // Prepend to list if loaded
    if (notifications.value.length > 0) {
      notifications.value.unshift(data as Notification)
    }
  }

  function initSocket(userId?: string) {
    const socket = connect()
    if (userId) {
      identify(userId)
    }
    socketCleanup = onFlowNotification(handleNewNotification)
  }

  function destroySocket() {
    socketCleanup?.()
    socketCleanup = null
  }

  return {
    notifications,
    unreadCount,
    total,
    loading,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markBatchAsRead,
    markAllAsRead,
    initSocket,
    destroySocket,
  }
})
