/**
 * useAuthStore -- auth state management
 *
 * Responsibilities:
 * - Hold user, token, isAuthenticated state
 * - Persist token to localStorage
 * - Provide thin set/reset actions (async logic lives in useAuth composable)
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser, AuthLoadingState } from '@/types/auth'

const TOKEN_KEY = 'shell_access_token'
const REFRESH_KEY = 'shell_refresh_token'

export const useAuthStore = defineStore('auth', () => {
  // ================================================================
  // State
  // ================================================================

  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_KEY))
  const loading = ref<AuthLoadingState>({ login: false, fetchUser: false })

  // ================================================================
  // Getters
  // ================================================================

  const isAuthenticated = computed(() => token.value !== null)

  // ================================================================
  // Actions (thin setters)
  // ================================================================

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

  function setUser(value: AuthUser | null): void {
    user.value = value
  }

  function setLoading(key: keyof AuthLoadingState, value: boolean): void {
    loading.value[key] = value
  }

  /** Clear all auth state */
  function reset(): void {
    user.value = null
    token.value = null
    refreshToken.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    loading.value = { login: false, fetchUser: false }
  }

  return {
    // state
    user,
    token,
    refreshToken,
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
