/**
 * useHomeData — 首页数据加载逻辑
 *
 * 职责：
 * - 调用后端 API 获取统计数据和对话列表
 * - 协调 useHomeStore 的 loading/error/data 状态
 * - 提供并行加载、单独刷新能力
 * - 组件卸载时自动重置
 *
 * 依赖：
 * - useHomeStore（状态持有）
 * - apiClient（HTTP 通信）
 */
import { onUnmounted } from 'vue'
import { useHomeStore } from '@/stores/home'
import { apiClient } from '@/utils/apiClient'
import type { DashboardStats, RecentConversation } from '@/types/home'

export function useHomeData() {
  const store = useHomeStore()

  /**
   * 获取仪表盘统计数据
   */
  async function fetchStats(): Promise<void> {
    store.setStatsLoading(true)
    store.setStatsError(null)
    try {
      const data = await apiClient.get<DashboardStats>('/stats')
      store.setStats(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load stats'
      store.setStatsError(msg)
    } finally {
      store.setStatsLoading(false)
    }
  }

  /**
   * 获取最新 AI 对话列表
   */
  async function fetchConversations(): Promise<void> {
    store.setConversationsLoading(true)
    store.setConversationsError(null)
    try {
      const data = await apiClient.get<RecentConversation[]>('/stats/conversations')
      store.setConversations(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load conversations'
      store.setConversationsError(msg)
    } finally {
      store.setConversationsLoading(false)
    }
  }

  /**
   * 并行加载所有首页数据
   */
  async function fetchAll(): Promise<void> {
    await Promise.all([fetchStats(), fetchConversations()])
  }

  /**
   * 刷新单个模块
   */
  async function refreshStats(): Promise<void> {
    await fetchStats()
  }

  async function refreshConversations(): Promise<void> {
    await fetchConversations()
  }

  // 组件卸载时重置 store
  onUnmounted(() => {
    store.reset()
  })

  return {
    // 从 store 透传的响应式状态
    stats: store.stats,
    conversations: store.conversations,
    loading: store.loading,
    error: store.error,
    isLoading: store.isLoading,
    hasError: store.hasError,
    hasStats: store.hasStats,
    isConversationsEmpty: store.isConversationsEmpty,
    // 方法
    fetchAll,
    fetchStats,
    fetchConversations,
    refreshStats,
    refreshConversations,
  }
}
