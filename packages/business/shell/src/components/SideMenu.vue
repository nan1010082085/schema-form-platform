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
import { useMenu } from '@/composables/useMenu'
import { resolveIconName } from '@schema-form/platform-shared/utils/iconResolver'
import type { MenuTreeNode } from '@/types/menu'
import styles from './SideMenu.module.scss'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

/** 根据图标名获取 Element Plus 图标组件 */
function resolveIcon(name?: string): string {
  return resolveIconName(name)
}

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
  const p = route.path
  const q = route.query
  // Schema 页面匹配：/app/editor/view?id={schemaId}
  if (node.routeType === 'schema' && node.schemaId) {
    return p.includes('/editor/view') && q.id === node.schemaId
  }
  // 外部链接不激活
  if (node.routeType === 'link') return false
  // 默认：path 匹配
  if (!node.path) return false
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
  const routeType = node.routeType || 'micro-app'

  if (routeType === 'schema') {
    // Schema 页面：路由到 editor 的 PublishView 渲染
    if (node.schemaId) {
      router.push(`/app/editor/view?id=${node.schemaId}`)
    }
    return
  }

  if (routeType === 'link') {
    // 外部链接
    const url = node.url || node.path
    if (!url) return
    if (node.target === '_blank') {
      window.open(url, '_blank')
    } else {
      window.location.href = url
    }
    return
  }

  // routeType === 'micro-app'
  if (!node.path) return
  if (node.target === '_blank') {
    // 新页签：使用 /standalone/{appName}/{subPath} 路由（无菜单全屏模式）
    // node.path 类似 /flow/design，需要去掉 appId 前缀避免路径重复
    const appId = node.microAppId
    if (appId) {
      const subPath = appId && node.path.startsWith(`/${appId}/`)
        ? node.path.slice(appId.length + 1)
        : node.path
      const url = `/schema-platform/standalone/${appId}${subPath}`
      window.open(url, '_blank')
    } else {
      window.open(node.path, '_blank')
    }
  } else {
    // 嵌入模式：/app/{appName}/{path}
    const appId = node.microAppId
    if (appId) {
      router.push(`/app/${appId}${node.path}`)
    } else {
      router.push(node.path)
    }
  }
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
        <span v-show="!collapsed" :class="styles.logoText">表单设计器</span>
      </router-link>
    </div>

    <!-- Menu list -->
    <nav :class="styles.menuNav">
      <!-- Loading -->
      <div v-if="menuLoading" :class="styles.menuLoading">
        <AppIcon name="loading" :size="20" :class="styles.spinIcon" />
        <span v-show="!collapsed" :class="styles.menuLoadingText">加载中...</span>
      </div>

      <!-- Error -->
      <div v-else-if="menuError" :class="styles.menuError">
        <span v-show="!collapsed" :class="styles.menuErrorText">{{ menuError }}</span>
        <el-button type="primary" text size="small" @click="fetchMenus">重试</el-button>
      </div>

      <!-- Home entry -->
      <div v-if="!menuLoading && !menuError" :class="[styles.menuItem, { [styles.menuItemActive]: route.path === '/' }]" @click="router.push('/')">
        <AppIcon name="home-filled" :size="18" />
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
                [styles.menuItemActive]: isActive(node) && !(node.children?.length && node.target !== '_blank'),
                [styles.menuItemOpen]: hasActiveChild(node) || isSubmenuOpen(node.id),
              },
            ]"
            :title="collapsed ? node.name : undefined"
            @click="handleMenuClick(node)"
          >
            <AppIcon :name="resolveIcon(node.icon)" :size="18" />
            <span v-show="!collapsed" :class="styles.menuLabel">{{ node.name }}</span>
            <AppIcon
              v-if="node.children?.length && node.target !== '_blank' && !collapsed"
              name="arrow-down"
              :size="12"
              :class="[styles.menuArrow, { [styles.menuArrowOpen]: isSubmenuOpen(node.id) }]"
            />
          </div>

          <!-- Level 2 submenu (expanded) - only show for target=_self -->
          <div
            v-if="node.children?.length && node.target !== '_blank' && !collapsed && isSubmenuOpen(node.id)"
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
      <AppIcon :name="collapsed ? 'expand' : 'fold'" :size="16" />
      <span v-show="!collapsed" :class="styles.collapseText">折叠</span>
    </div>
  </aside>
</template>
