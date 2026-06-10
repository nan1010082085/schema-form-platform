/**
 * useAuth — 认证业务逻辑
 *
 * 职责：
 * - 调用 /api/auth/login、/api/auth/me、/api/auth/logout
 * - 协调 useAuthStore 的 loading/token/user 状态
 * - 登录成功后跳转，退出后跳转
 *
 * 依赖：
 * - useAuthStore（状态持有）
 * - apiClient（HTTP 通信）
 * - vue-router（路由跳转）
 * - usePermission（权限清除）
 */
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'
import { apiClient, setTokenProvider, setUnauthorizedHandler } from '@/utils/apiClient'
import type { LoginPayload, LoginResponse, AuthUser } from '@/types/auth'

/** 是否已注入 tokenProvider（全局只执行一次） */
let providerInitialized = false

export function useAuth() {
  const store = useAuthStore()
  const router = useRouter()
  const route = useRoute()
  const { user, token, isAuthenticated, loading } = storeToRefs(store)
  const { clearPermissions } = usePermission()

  // 注入 tokenProvider + 401 回调，使 apiClient 自动携带 Authorization header
  if (!providerInitialized) {
    setTokenProvider(() => store.token)
    setUnauthorizedHandler(() => {
      store.reset()
      clearPermissions()
    })
    providerInitialized = true
  }

  /**
   * 用户名密码登录
   * 成功后写入 token + user，跳转到 redirect 参数指定的页面或首页
   */
  async function login(payload: LoginPayload): Promise<void> {
    store.setLoading('login', true)
    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', payload)
      store.setToken(res.accessToken)
      store.setUser(res.user)
      const redirect = (route.query.redirect as string) || '/'
      await router.push(redirect)
    } finally {
      store.setLoading('login', false)
    }
  }

  /**
   * 根据已有 token 获取当前用户信息
   * 用于页面刷新后恢复登录态
   */
  async function fetchUser(): Promise<void> {
    if (!token.value) return

    store.setLoading('fetchUser', true)
    try {
      const res = await apiClient.get<AuthUser>('/auth/me')
      store.setUser(res)
    } catch {
      // token 无效，清除状态
      store.reset()
      clearPermissions()
    } finally {
      store.setLoading('fetchUser', false)
    }
  }

  /**
   * 退出登录
   * 清除状态和权限，跳转登录页
   */
  async function logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      store.reset()
      clearPermissions()
      await router.push('/login')
    }
  }

  return {
    // 状态（storeToRefs 保持响应性）
    user,
    token,
    isAuthenticated,
    loading,
    // 方法
    login,
    fetchUser,
    logout,
  }
}
