/**
 * useHomeStore — 首页仪表盘数据
 *
 * 职责：
 * - 持有 DashboardStats 和 RecentConversation[] 数据
 * - 管理加载状态和错误状态
 *
 * 设计原则：
 * - 纯状态持有，异步逻辑在 useHomeData composable 中
 * - stats 与 conversations 独立 loading，支持并行加载
 */
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type {
  DashboardStats,
  RecentConversation,
  HomeLoadingState,
  HomeErrorState,
} from '@/types/home'

export const useHomeStore = defineStore('home', () => {
  // ================================================================
  // State
  // ================================================================

  const stats = ref<DashboardStats | null>(null)
  const conversations = ref<RecentConversation[]>([])

  const loading = reactive<HomeLoadingState>({
    stats: false,
    conversations: false,
  })

  const error = reactive<HomeErrorState>({
    stats: null,
    conversations: null,
  })

  // ================================================================
  // Getters
  // ================================================================

  /** 是否有任何加载中 */
  const isLoading = computed(() => loading.stats || loading.conversations)

  /** 是否有错误 */
  const hasError = computed(() => error.stats !== null || error.conversations !== null)

  /** 统计数据是否已加载 */
  const hasStats = computed(() => stats.value !== null)

  /** 对话列表是否为空 */
  const isConversationsEmpty = computed(
    () => !loading.conversations && conversations.value.length === 0,
  )

  // ================================================================
  // Actions (薄设置层)
  // ================================================================

  function setStats(data: DashboardStats): void {
    stats.value = data
  }

  function setConversations(data: RecentConversation[]): void {
    conversations.value = data
  }

  function setStatsLoading(v: boolean): void {
    loading.stats = v
  }

  function setConversationsLoading(v: boolean): void {
    loading.conversations = v
  }

  function setStatsError(msg: string | null): void {
    error.stats = msg
  }

  function setConversationsError(msg: string | null): void {
    error.conversations = msg
  }

  /** 重置全部状态（页面卸载时） */
  function reset(): void {
    stats.value = null
    conversations.value = []
    loading.stats = false
    loading.conversations = false
    error.stats = null
    error.conversations = null
  }

  return {
    // state
    stats,
    conversations,
    loading,
    error,
    // getters
    isLoading,
    hasError,
    hasStats,
    isConversationsEmpty,
    // actions
    setStats,
    setConversations,
    setStatsLoading,
    setConversationsLoading,
    setStatsError,
    setConversationsError,
    reset,
  }
})
