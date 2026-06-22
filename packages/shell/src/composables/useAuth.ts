/**
 * useAuth -- authentication business logic
 *
 * Responsibilities:
 * - Call /api/auth/login, /api/auth/me, /api/auth/refresh, /api/auth/logout
 * - Coordinate useAuthStore loading/token/user state
 * - Auto-refresh access token before expiry
 * - Post-login redirect, post-logout redirect
 *
 * Dependencies:
 * - useAuthStore (state holder)
 * - apiClient (HTTP)
 * - vue-router (navigation)
 */
import { onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiClient, setTokenProvider, setUnauthorizedHandler } from '@schema-form/shared-utils/apiClient'
import type { LoginPayload, LoginResponse, AuthUser } from '@schema-form/shared-utils/authTypes'

/** Whether tokenProvider has been injected (once globally) */
let providerInitialized = false

/** Auto-refresh timer handle */
let refreshTimer: ReturnType<typeof setTimeout> | null = null

export function useAuth() {
  const store = useAuthStore()
  const router = useRouter()
  const route = useRoute()
  const { user, token, refreshToken, isAuthenticated, loading } = storeToRefs(store)

  // Inject tokenProvider + 401 handler so apiClient auto-attaches Authorization header
  if (!providerInitialized) {
    setTokenProvider(() => store.token)
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
      store.setToken(res.accessToken)
      scheduleRefresh(res.expiresIn)
    } catch {
      // Refresh failed -- clear auth state, user must re-login
      cancelRefresh()
      store.reset()
    }
  }

  /**
   * SSO login: exchange authorization code for tokens.
   * On success: persist tokens + user, redirect to ?redirect= or /.
   */
  async function ssoLogin(code: string): Promise<void> {
    store.setLoading('login', true)
    try {
      const res = await apiClient.post<{
        accessToken: string
        refreshToken: string
        expiresIn: number
      }>('/auth/sso/token', {
        code,
        client_id: 'shell',
        redirect_uri: `${window.location.origin}/schema-platform/sso/callback`,
      })
      store.setToken(res.accessToken, res.refreshToken)
      // Fetch user info after getting token
      const userRes = await apiClient.get<AuthUser>('/auth/me')
      store.setUser(userRes)
      store.setUserKey(userRes.id)
      scheduleRefresh(res.expiresIn)
      const redirect = (route.query.redirect as string) || '/'
      await router.push(redirect)
    } finally {
      store.setLoading('login', false)
    }
  }

  /**
   * Username/password login.
   * On success: persist tokens + user, redirect to ?redirect= or /.
   */
  async function login(payload: LoginPayload): Promise<void> {
    store.setLoading('login', true)
    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', payload)
      store.setToken(res.accessToken, res.refreshToken)
      store.setUser(res.user)
      store.setUserKey(res.user.id)
      scheduleRefresh(res.expiresIn)
      const redirect = (route.query.redirect as string) || '/'
      await router.push(redirect)
    } finally {
      store.setLoading('login', false)
    }
  }

  /**
   * Fetch current user by existing token.
   * Used to restore login state after page refresh.
   */
  async function fetchUser(): Promise<void> {
    if (!token.value) return

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
    // Do NOT cancel refresh here -- it should persist across component mounts.
    // Only logout() and 401 handler cancel it.
  })

  return {
    // state (storeToRefs preserves reactivity)
    user,
    token,
    refreshToken,
    isAuthenticated,
    loading,
    // methods
    login,
    ssoLogin,
    fetchUser,
    logout,
    doRefresh,
  }
}
