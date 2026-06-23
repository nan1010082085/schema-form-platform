/**
 * 布局状态管理
 *
 * 管理 Shell 容器的布局风格、侧边栏状态等
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type LayoutStyle = 'sidebar' | 'topnav'

export const useLayoutStore = defineStore('layout', () => {
  // ================================================================
  // State
  // ================================================================

  /** 布局风格 */
  const style = ref<LayoutStyle>(
    (localStorage.getItem('layout_style') as LayoutStyle) || 'sidebar'
  )

  /** 侧边栏折叠状态 */
  const collapsed = ref(false)

  /** 侧边栏折叠状态持久化 */
  const collapsedPersist = ref(
    localStorage.getItem('sidebar_collapsed') === 'true'
  )

  // ================================================================
  // Getters
  // ================================================================

  const isSidebar = computed(() => style.value === 'sidebar')
  const isTopNav = computed(() => style.value === 'topnav')

  // ================================================================
  // Actions
  // ================================================================

  /**
   * 切换布局风格
   */
  function setStyle(newStyle: LayoutStyle) {
    style.value = newStyle
    localStorage.setItem('layout_style', newStyle)
  }

  /**
   * 切换侧边栏折叠状态
   */
  function toggleCollapse() {
    collapsed.value = !collapsed.value
    collapsedPersist.value = collapsed.value
    localStorage.setItem('sidebar_collapsed', String(collapsed.value))
  }

  /**
   * 设置侧边栏折叠状态
   */
  function setCollapsed(value: boolean) {
    collapsed.value = value
    collapsedPersist.value = value
    localStorage.setItem('sidebar_collapsed', String(value))
  }

  /**
   * 恢复折叠状态
   */
  function restoreCollapsed() {
    collapsed.value = collapsedPersist.value
  }

  /**
   * 重置状态
   */
  function reset() {
    style.value = 'sidebar'
    collapsed.value = false
    collapsedPersist.value = false
    localStorage.removeItem('layout_style')
    localStorage.removeItem('sidebar_collapsed')
  }

  return {
    // state
    style,
    collapsed,
    collapsedPersist,
    // getters
    isSidebar,
    isTopNav,
    // actions
    setStyle,
    toggleCollapse,
    setCollapsed,
    restoreCollapsed,
    reset,
  }
})
