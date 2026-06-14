<script setup lang="ts">
/**
 * SideMenu -- sidebar menu component
 *
 * Responsibilities:
 * - Render logo area
 * - Fetch and render dynamic menu tree from /api/menus/route
 * - Highlight active route
 * - Support collapse/expand
 *
 * Pure rendering component -- all logic comes from composables.
 */
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// TDesign icons are used via <t-icon name="xxx" /> — no imports needed
import { useMenu } from '@/composables/useMenu'
import type { MenuTreeNode } from '@/types/menu'
import styles from './SideMenu.module.css'

const props = defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggleCollapse: []
}>()

const route = useRoute()
const router = useRouter()
const { menuTree, loading: menuLoading, error: menuError, fetchMenus, reset: resetMenu } = useMenu()

// Fetch menus on mount
fetchMenus()

/** Check if a menu node matches the current route */
function isActive(node: MenuTreeNode): boolean {
  if (!node.path) return false
  const p = route.path
  return p === node.path || p.startsWith(node.path + '/')
}

/** Check if any child route is active */
function hasActiveChild(node: MenuTreeNode): boolean {
  if (!node.children?.length) return false
  return node.children.some(child => isActive(child) || hasActiveChild(child))
}

/** Track open submenus */
const openedMenus = ref<Set<string>>(new Set())

function toggleSubmenu(menuId: string): void {
  const next = new Set(openedMenus.value)
  if (next.has(menuId)) {
    next.delete(menuId)
  } else {
    next.add(menuId)
  }
  openedMenus.value = next
}

function isSubmenuOpen(menuId: string): boolean {
  return openedMenus.value.has(menuId)
}

// Close submenus when collapsing
watch(() => props.collapsed, (val) => {
  if (val) openedMenus.value = new Set()
})

/** Navigate to a menu route */
function navigateTo(node: MenuTreeNode): void {
  if (!node.path) return
  router.push(node.path)
}

/** Handle menu item click */
function handleMenuClick(node: MenuTreeNode): void {
  if (node.children?.length) {
    if (props.collapsed) return
    toggleSubmenu(node.id)
  } else {
    navigateTo(node)
  }
}

defineExpose({ resetMenu })
</script>

<template>
  <aside :class="[styles.sidebar, { [styles.sidebarCollapsed]: collapsed }]">
    <!-- Logo -->
    <div :class="styles.sidebarHeader">
      <router-link to="/" :class="styles.logoArea">
        <div :class="styles.logoIcon">S</div>
        <span v-show="!collapsed" :class="styles.logoText">Shell</span>
      </router-link>
    </div>

    <!-- Menu list -->
    <nav :class="styles.menuNav">
      <!-- Loading -->
      <div v-if="menuLoading" :class="styles.menuLoading">
        <t-icon name="loading" :size="20" :class="styles.spinIcon" />
        <span v-show="!collapsed" :class="styles.menuLoadingText">加载中...</span>
      </div>

      <!-- Error -->
      <div v-else-if="menuError" :class="styles.menuError">
        <span v-show="!collapsed" :class="styles.menuErrorText">{{ menuError }}</span>
        <t-button variant="text" size="small" @click="fetchMenus">重试</t-button>
      </div>

      <!-- Home entry -->
      <div
        v-if="!menuLoading && !menuError"
        :class="[styles.menuItem, { [styles.menuItemActive]: route.path === '/' }]"
        @click="router.push('/')"
      >
        <t-icon name="home-filled" :size="18" />
        <span v-show="!collapsed" :class="styles.menuLabel">首页</span>
      </div>

      <!-- Dynamic menu tree -->
      <template v-if="!menuLoading && !menuError">
        <div v-for="node in menuTree" :key="node.id">
          <!-- Level 1 menu item -->
          <div
            :class="[
              styles.menuItem,
              {
                [styles.menuItemActive]: isActive(node) && !node.children?.length,
                [styles.menuItemOpen]: hasActiveChild(node) || isSubmenuOpen(node.id),
              },
            ]"
            :title="collapsed ? node.name : undefined"
            @click="handleMenuClick(node)"
          >
            <t-icon :name="node.icon || 'file'" :size="18" />
            <span v-show="!collapsed" :class="styles.menuLabel">{{ node.name }}</span>
            <t-icon
              v-if="node.children?.length && !collapsed"
              name="chevron-right"
              :class="[styles.menuArrow, { [styles.menuArrowOpen]: isSubmenuOpen(node.id) }]"
              :size="12"
            />
          </div>

          <!-- Level 2 submenu (expanded) -->
          <div
            v-if="node.children?.length && !collapsed && isSubmenuOpen(node.id)"
            :class="styles.submenu"
          >
            <div
              v-for="child in node.children"
              :key="child.id"
              :class="[styles.submenuItem, { [styles.submenuItemActive]: isActive(child) }]"
              @click="navigateTo(child)"
            >
              <span :class="styles.submenuLabel">{{ child.name }}</span>
            </div>
          </div>
        </div>
      </template>
    </nav>

    <!-- Collapse button -->
    <div :class="styles.sidebarFooter" @click="emit('toggleCollapse')">
      <t-icon v-if="collapsed" name="menu-unfold" :size="16" />
      <t-icon v-else name="menu-fold" :size="16" />
      <span v-show="!collapsed" :class="styles.collapseText">Collapse</span>
    </div>
  </aside>
</template>
