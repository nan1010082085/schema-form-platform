/**
 * useMenuStore -- menu state management
 *
 * Responsibilities:
 * - Hold menu tree, loading, error state
 * - Thin setters (fetch logic lives in useMenu composable)
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MenuTreeNode } from '@/types/menu'

export const useMenuStore = defineStore('menu', () => {
  // ================================================================
  // State
  // ================================================================

  const menuTree = ref<MenuTreeNode[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  // ================================================================
  // Getters
  // ================================================================

  const hasMenus = computed(() => menuTree.value.length > 0)

  // ================================================================
  // Actions (thin setters)
  // ================================================================

  function setMenuTree(tree: MenuTreeNode[]): void {
    menuTree.value = tree
    loaded.value = true
  }

  function setLoading(value: boolean): void {
    loading.value = value
  }

  function setError(value: string | null): void {
    error.value = value
  }

  function reset(): void {
    menuTree.value = []
    loaded.value = false
    error.value = null
    loading.value = false
  }

  return {
    // state
    menuTree,
    loading,
    error,
    loaded,
    // getters
    hasMenus,
    // actions
    setMenuTree,
    setLoading,
    setError,
    reset,
  }
})
