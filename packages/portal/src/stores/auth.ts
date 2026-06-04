/**
 * useAuthStore — 认证状态管理
 *
 * 职责：
 * - 持有 user、token、isAuthenticated 状态
 * - token 持久化到 localStorage
 * - 提供 login/logout/fetchUser 状态设置
 *
 * 设计原则：
 * - 纯状态持有 + 薄 action，异步逻辑在 useAuth composable 中
 * - token 从 localStorage 恢复，保证刷新后登录态不丢失
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser, AuthLoadingState } from '@/types/auth'

const TOKEN_KEY = 'portal_token'

export const useAuthStore = defineStore('auth', () => {
  // ================================================================
  // State
  // ================================================================

  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const loading = ref<AuthLoadingState>({ login: false, fetchUser: false })

  // ================================================================
  // Getters
  // ================================================================

  const isAuthenticated = computed(() => token.value !== null)

  // ================================================================
  // Actions (薄设置层)
  // ================================================================

  function setToken(value: string | null): void {
    token.value = value
    if (value) {
      localStorage.setItem(TOKEN_KEY, value)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  function setUser(value: AuthUser | null): void {
    user.value = value
  }

  function setLoading(key: keyof AuthLoadingState, value: boolean): void {
    loading.value[key] = value
  }

  /** 清除全部认证状态 */
  function reset(): void {
    user.value = null
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
    loading.value = { login: false, fetchUser: false }
  }

  return {
    // state
    user,
    token,
    loading,
    // getters
    isAuthenticated,
    // actions
    setToken,
    setUser,
    setLoading,
    reset,
  }
})
