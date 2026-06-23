/**
 * useAuth -- 共享认证业务逻辑
 *
 * 所有子应用（admin、editor、flow、ai、shell）统一使用此 composable。
 * - 调用 /api/auth/login、/api/auth/me、/api/auth/refresh、/api/auth/logout
 * - 协调 useAuthStore 的 loading/token/user 状态
 * - 自动刷新 access token（过期前 60s）
 * - 登录后跳转、登出后跳转
 *
 * Dependencies:
 * - useAuthStore (状态持有)
 * - apiClient (HTTP)
 * - vue-router (导航)
 */
import { onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/authStore'
import { apiClient, setTokenProvider, setUnauthorizedHandler } from './apiClient'
import type { LoginPayload, LoginResponse, AuthUser } from './authTypes'

/** Whether tokenProvider has been injected (once globally) */
let providerInitialized = false

/** Auto-refresh timer handle */
let refreshTimer: ReturnType<typeof setTimeout> | null = null

export function useAuth() {
  const store = useAuthStore()
  const router = useRouter()
  const route = useRoute()
  const { user, accessToken, refreshToken, isAuthenticated, loading } = storeToRefs(store)

  // Inject tokenProvider + 401 handler so apiClient auto-attaches Authorization header
  if (!providerInitialized) {
    setTokenProvider(() => store.accessToken)
    setUnauthorizedHandler(() => {
      cancelRefresh()
      store.reset()
    })
    providerInitialized = true
  }

  /**
   * Schedule automatic token refresh 60s before expiry.
   * @param expiresIn - seconds until access token expires
   */
  function scheduleRefresh(expiresIn: number): void {
    cancelRefresh()
    // Refresh 60s before expiry, minimum 10s
    const delay = Math.max((expiresIn - 60) * 1000, 10_000)
    refreshTimer = setTimeout(() => {
      doRefresh()
    }, delay)
  }

  /** Cancel pending auto-refresh */
  function cancelRefresh(): void {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }

  /**
   * Exchange refresh token for a new access token.
   * Silently fails if refresh token is invalid (user will hit 401 on next request).
   */
  async function doRefresh(): Promise<void> {
    const rt = store.refreshToken
    if (!rt) return

    try {
      const res = await apiClient.post<{ accessToken: string; expiresIn: number }>('/auth/refresh', {
        refreshToken: rt,
      })
      store.setTokens(res.accessToken)
      scheduleRefresh(res.expiresIn)
    } catch {
      // Refresh failed -- clear auth state, user must re-login
      cancelRefresh()
      store.reset()
    }
  }

  /**
   * Username/password login.
   * On success: persist tokens + user, redirect to ?redirect= or /.
   *
   * @param payload - { username, password }
   * @param onSuccess - 可选的成功回调，用于自定义跳转逻辑
   */
  async function login(payload: LoginPayload, onSuccess?: (redirect: string) => void): Promise<void> {
    store.setLoading('login', true)
    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', payload)
      store.setTokens(res.accessToken, res.refreshToken)
      store.setUser(res.user)
      store.setUserKey(res.user.id)
      scheduleRefresh(res.expiresIn)

      const redirect = (route.query.redirect as string) || '/'

      if (onSuccess) {
        onSuccess(redirect)
      } else {
        await router.push(redirect)
      }
    } finally {
      store.setLoading('login', false)
    }
  }

  /**
   * Fetch current user by existing token.
   * Used to restore login state after page refresh.
   */
  async function fetchUser(): Promise<void> {
    if (!accessToken.value) return

    store.setLoading('fetchUser', true)
    try {
      const res = await apiClient.get<AuthUser>('/auth/me')
      store.setUser(res)
      // Re-schedule refresh (we don't know original expiresIn after page reload,
      // assume 15min = 900s from now as the token was issued at login)
      scheduleRefresh(900)
    } catch {
      // Token invalid -- clear state
      cancelRefresh()
      store.reset()
    } finally {
      store.setLoading('fetchUser', false)
    }
  }

  /**
   * Logout: call server, clear state, redirect to /login.
   */
  async function logout(): Promise<void> {
    cancelRefresh()
    try {
      await apiClient.post('/auth/logout')
    } finally {
      store.reset()
      await router.push('/login')
    }
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    // DO NOT cancel refresh here -- it should persist across component mounts.
    // Only logout() and 401 handler cancel it.
  })

  return {
    // state (storeToRefs preserves reactivity)
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    loading,
    // methods
    login,
    fetchUser,
    logout,
    doRefresh,
  }
}
