/**
 * useSidebar — 侧边栏状态管理
 *
 * 职责：
 * - 管理侧边栏展开/折叠状态
 * - 持久化到 localStorage
 * - 管理各子菜单的展开状态
 */
import { ref } from 'vue'

const STORAGE_KEY = 'portal_sidebar_collapsed'

/** 侧边栏是否折叠 */
const collapsed = ref(localStorage.getItem(STORAGE_KEY) === 'true')

/** 当前展开的子菜单 key 集合 */
const openedMenus = ref<string[]>([])

export function useSidebar() {
  /** 切换折叠状态 */
  function toggleCollapse(): void {
    collapsed.value = !collapsed.value
    localStorage.setItem(STORAGE_KEY, String(collapsed.value))
  }

  /** 设置折叠状态 */
  function setCollapsed(value: boolean): void {
    collapsed.value = value
    localStorage.setItem(STORAGE_KEY, String(value))
  }

  /** 切换子菜单展开 */
  function toggleSubmenu(menuId: string): void {
    const index = openedMenus.value.indexOf(menuId)
    if (index >= 0) {
      openedMenus.value.splice(index, 1)
    } else {
      openedMenus.value.push(menuId)
    }
  }

  /** 判断子菜单是否展开 */
  function isSubmenuOpen(menuId: string): boolean {
    return openedMenus.value.includes(menuId)
  }

  /** 折叠时关闭所有子菜单 */
  function closeAllSubmenus(): void {
    openedMenus.value = []
  }

  return {
    collapsed,
    openedMenus,
    toggleCollapse,
    setCollapsed,
    toggleSubmenu,
    isSubmenuOpen,
    closeAllSubmenus,
  }
}
