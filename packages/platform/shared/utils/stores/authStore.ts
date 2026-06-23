/**
 * useAuthStore -- 共享认证状态管理
 *
 * 各子项目（shell、editor、flow、ai-app、admin）统一使用此 store。
 * - 纯状态持有 + 薄 action，异步逻辑在各项目的 useAuth composable 中
 * - token 从 localStorage 恢复，保证刷新后登录态不丢失
 * - 统一 localStorage key 前缀 sfp_（schema-form-platform）
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser, AuthLoadingState } from '../authTypes.js'

const ACCESS_TOKEN_KEY = 'sfp_access_token'
const REFRESH_TOKEN_KEY = 'sfp_refresh_token'
const USER_KEY = 'sfp_user_key'

export const useAuthStore = defineStore('auth', () => {
  // ================================================================
  // State
  // ================================================================

  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY))
  const userKey = ref<string | null>(localStorage.getItem(USER_KEY))
  const user = ref<AuthUser | null>(null)
  const loading = ref<AuthLoadingState>({ login: false, fetchUser: false })

  // ================================================================
  // Getters
  // ================================================================

  const isAuthenticated = computed(() => accessToken.value !== null)

  // ================================================================
  // Actions (薄设置层)
  // ================================================================

  /** 设置 access + refresh token，同步持久化到 localStorage */
  function setTokens(access: string | null, refresh?: string | null): void {
    accessToken.value = access
    if (access) {
      localStorage.setItem(ACCESS_TOKEN_KEY, access)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
    if (refresh !== undefined) {
      refreshToken.value = refresh
      if (refresh) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY)
      }
    }
  }

  /** 设置用户唯一标识（如 userId），用于跨 tab / 跨应用识别当前登录用户 */
  function setUserKey(key: string | null): void {
    userKey.value = key
    if (key) {
      localStorage.setItem(USER_KEY, key)
    } else {
      localStorage.removeItem(USER_KEY)
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
    accessToken.value = null
    refreshToken.value = null
    userKey.value = null
    user.value = null
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    loading.value = { login: false, fetchUser: false }
  }

  return {
    // state
    accessToken,
    refreshToken,
    userKey,
    user,
    loading,
    // getters
    isAuthenticated,
    // actions
    setTokens,
    setUserKey,
    setUser,
    setLoading,
    reset,
  }
})
