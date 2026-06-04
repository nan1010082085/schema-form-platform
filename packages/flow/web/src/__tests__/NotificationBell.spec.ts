import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import NotificationBell from '../components/NotificationBell.vue'

vi.mock('../api/flowApi', () => ({
  flowApi: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markNotificationAsRead: vi.fn(),
    markAllNotificationsAsRead: vi.fn(),
  },
}))

import { flowApi } from '../api/flowApi.js'
const mockedApi = vi.mocked(flowApi)

describe('NotificationBell', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockedApi.getUnreadCount.mockResolvedValue({ count: 0 })
    mockedApi.getNotifications.mockResolvedValue({
      items: [],
      total: 0,
      unreadCount: 0,
    })
  })

  function createWrapper() {
    return mount(NotificationBell, {
      global: {
        plugins: [ElementPlus],
      },
    })
  }

  it('mounts without errors', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('displays bell icon', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.el-icon').exists()).toBe(true)
  })

  it('fetches unread count on mount', () => {
    createWrapper()
    expect(mockedApi.getUnreadCount).toHaveBeenCalled()
  })

  it('displays unread count badge when count > 0', async () => {
    mockedApi.getUnreadCount.mockResolvedValue({ count: 5 })
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const badge = wrapper.find('.el-badge__content')
    expect(badge.exists()).toBe(true)
  })

  it('hides badge when unread count is 0', async () => {
    mockedApi.getUnreadCount.mockResolvedValue({ count: 0 })
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const badge = wrapper.find('.el-badge__content')
    expect(badge.exists()).toBe(false)
  })
})
