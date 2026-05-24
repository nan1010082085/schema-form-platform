/**
 * 认证 Store
 *
 * 管理独立运行模式下的登录状态：token 持久化、用户信息、登录/登出。
 * qiankun 模式下 token 由主应用注入（app store），此 store 不参与。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  login as apiLogin,
  fetchCurrentUser,
  type LoginPayload,
  type LoginResponse,
} from '@/utils/apiClient'

const STORAGE_KEY = 'auth_token'

export const useAuthStore = defineStore('auth', () => {
  // ---- State ----
  const token = ref(localStorage.getItem(STORAGE_KEY) ?? '')
  const user = ref<LoginResponse['user'] | null>(null)
  const loading = ref(false)

  // ---- Computed ----
  const isLoggedIn = computed(() => token.value !== '')

  // ---- Actions ----

  async function login(username: string, password: string): Promise<void> {
    loading.value = true
    try {
      const payload: LoginPayload = { username, password }
      const res = await apiLogin(payload)
      token.value = res.token
      user.value = res.user
      localStorage.setItem(STORAGE_KEY, res.token)
    } finally {
      loading.value = false
    }
  }

  function logout(): void {
    token.value = ''
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  async function loadCurrentUser(): Promise<void> {
    if (!token.value) return
    user.value = await fetchCurrentUser()
  }

  return {
    token,
    user,
    loading,
    isLoggedIn,
    login,
    logout,
    loadCurrentUser,
  }
})
