/**
 * useAuthStore — Admin 认证与权限状态
 *
 * 从后端获取当前用户信息和权限码列表，供 v-permission 指令和菜单过滤使用。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '../utils/apiClient'

interface UserInfo {
  id: string
  username: string
  nickname?: string
  roles?: string[]
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const permissions = ref<string[]>([])
  const loaded = ref(false)

  /** 当前用户是否为管理员（拥有所有权限） */
  const isAdmin = computed(() => user.value?.roles?.includes('admin') ?? false)

  /** 检查是否拥有指定权限 */
  function hasPermission(code: string): boolean {
    if (isAdmin.value) return true
    return permissions.value.includes(code)
  }

  /** 检查是否拥有任一权限（OR 逻辑） */
  function hasAnyPermission(codes: string[]): boolean {
    if (isAdmin.value) return true
    return codes.some(c => permissions.value.includes(c))
  }

  /** 从后端加载用户信息和权限 */
  async function loadUser() {
    if (loaded.value) return
    try {
      const userData = await apiClient.get<UserInfo>('/auth/me')
      user.value = userData

      // 加载权限码
      const permData = await apiClient.get<string[]>('/roles/my-permissions')
      permissions.value = Array.isArray(permData) ? permData : []
      loaded.value = true
    } catch {
      // 未登录或请求失败，不阻塞
      user.value = null
      permissions.value = []
      loaded.value = true
    }
  }

  /** 清除状态（登出时调用） */
  function reset() {
    user.value = null
    permissions.value = []
    loaded.value = false
  }

  return { user, permissions, isAdmin, hasPermission, hasAnyPermission, loadUser, reset }
})
