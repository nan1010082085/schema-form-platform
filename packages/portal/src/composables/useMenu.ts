/**
 * useMenu — 动态菜单数据获取
 *
 * 职责：
 * - 调用 /api/menus/route 获取当前用户可见菜单树
 * - 管理加载状态和错误
 * - 提供刷新能力
 *
 * 依赖：
 * - apiClient（HTTP 通信）
 * - useAuthStore（判断登录态）
 */
import { ref } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { useAuthStore } from '@/stores/auth'
import type { MenuTreeNode } from '@/types/menu'

const menuTree = ref<MenuTreeNode[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const loaded = ref(false)

export function useMenu() {
  const authStore = useAuthStore()

  /** 是否有子菜单（用于判断是否渲染展开箭头） */
  function hasChildren(node: MenuTreeNode): boolean {
    return node.children.length > 0
  }

  /** 获取菜单树 */
  async function fetchMenus(): Promise<void> {
    if (!authStore.isAuthenticated) return

    loading.value = true
    error.value = null
    try {
      menuTree.value = await apiClient.get<MenuTreeNode[]>('/menus/route')
      loaded.value = true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '菜单加载失败'
    } finally {
      loading.value = false
    }
  }

  /** 重置状态（退出登录时调用） */
  function reset(): void {
    menuTree.value = []
    loaded.value = false
    error.value = null
  }

  return {
    menuTree,
    loading,
    error,
    loaded,
    fetchMenus,
    reset,
    hasChildren,
  }
}
