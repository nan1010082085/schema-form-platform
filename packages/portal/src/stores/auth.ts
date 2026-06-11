/**
 * useAuthStore — 认证状态管理
 *
 * 职责：
 * - 持有 user、token、refreshToken、userKey、isAuthenticated 状态
 * - token 持久化到 localStorage
 * - 提供 login/logout/fetchUser 状态设置
 *
 * 设计原则：
 * - 纯状态持有 + 薄 action，异步逻辑在 useAuth composable 中
 * - token 从 localStorage 恢复，保证刷新后登录态不丢失
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser, AuthLoadingState } from '@schema-form/shared-utils/authTypes'

const TOKEN_KEY = 'portal_token'
const REFRESH_KEY = 'portal_refresh_token'
const USER_KEY_KEY = 'portal_user_key'

export const useAuthStore = defineStore('auth', () => {
  // ================================================================
  // State
  // ================================================================

  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_KEY))
  const userKey = ref<string | null>(localStorage.getItem(USER_KEY_KEY))
  const loading = ref<AuthLoadingState>({ login: false, fetchUser: false })

  // ================================================================
  // Getters
  // ================================================================

  const isAuthenticated = computed(() => token.value !== null)

  // ================================================================
  // Actions (薄设置层)
  // ================================================================

  /** 设置 access + refresh token，同步持久化到 localStorage */
  function setToken(accessToken: string | null, refresh?: string | null): void {
    token.value = accessToken
    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
    if (refresh !== undefined) {
      refreshToken.value = refresh
      if (refresh) {
        localStorage.setItem(REFRESH_KEY, refresh)
      } else {
        localStorage.removeItem(REFRESH_KEY)
      }
    }
  }

  /** 设置用户唯一标识（如 userId），用于跨 tab / 跨应用识别当前登录用户 */
  function setUserKey(key: string | null): void {
    userKey.value = key
    if (key) {
      localStorage.setItem(USER_KEY_KEY, key)
    } else {
      localStorage.removeItem(USER_KEY_KEY)
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
    refreshToken.value = null
    userKey.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY_KEY)
    loading.value = { login: false, fetchUser: false }
  }

  return {
    // state
    user,
    token,
    refreshToken,
    userKey,
    loading,
    // getters
    isAuthenticated,
    // actions
    setToken,
    setUserKey,
    setUser,
    setLoading,
    reset,
  }
})
