/**
 * useMenu -- dynamic menu data fetching
 *
 * Responsibilities:
 * - Call /api/menus/route to get current user's visible menu tree
 * - Manage loading/error state via useMenuStore
 * - Provide reset capability (called on logout)
 *
 * Dependencies:
 * - useMenuStore (state holder)
 * - useAuthStore (check login state)
 * - apiClient (HTTP)
 */
import { storeToRefs } from 'pinia'
import { useMenuStore } from '@/stores/menu'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@schema-form/shared-utils/apiClient'
import type { MenuTreeNode } from '@/types/menu'

export function useMenu() {
  const menuStore = useMenuStore()
  const authStore = useAuthStore()
  const { menuTree, loading, error, loaded } = storeToRefs(menuStore)

  /** Check if a node has children (for rendering expand arrows) */
  function hasChildren(node: MenuTreeNode): boolean {
    return node.children.length > 0
  }

  /** Fetch menu tree for current user */
  async function fetchMenus(): Promise<void> {
    if (!authStore.isAuthenticated) return

    menuStore.setLoading(true)
    menuStore.setError(null)
    try {
      const tree = await apiClient.get<MenuTreeNode[]>('/menus/route')
      menuStore.setMenuTree(tree)
    } catch (e: unknown) {
      menuStore.setError(e instanceof Error ? e.message : 'Failed to load menus')
    } finally {
      menuStore.setLoading(false)
    }
  }

  /** Reset state (called on logout) */
  function reset(): void {
    menuStore.reset()
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
