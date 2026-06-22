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
import { APP_CONFIGS } from '@schema-form/shared-qiankun/config'
import { resolveIconName } from '@schema-form/shared-utils/iconResolver'
import type { MenuTreeNode } from '@/types/menu'
import styles from './SideMenu.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

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

/** microAppId → APP_CONFIGS key 映射 */
const APP_ID_MAP: Record<string, keyof typeof APP_CONFIGS> = {
  editor: 'editor',
  flow: 'flow',
  'ai-app': 'ai',
  admin: 'admin',
}

/** Navigate to a menu route */
function navigateTo(node: MenuTreeNode): void {
  const routeType = node.routeType || 'micro-app'

  if (routeType === 'schema') {
    // Schema 页面：直接路由到 editor 的 PublishView 渲染
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
      // _self: 当前页打开
      window.location.href = url
    }
    return
  }

  // routeType === 'micro-app'（默认，兼容旧数据）
  if (!node.path) return
  if (node.target === '_blank') {
    const isDev = import.meta.env.DEV
    const configKey = node.microAppId ? APP_ID_MAP[node.microAppId] : undefined
    if (configKey) {
      const config = APP_CONFIGS[configKey]
      const url = isDev
        ? `//localhost:${config.devPort}/`
        : `${window.location.origin}${config.basePath}`
      window.open(url, '_blank')
    } else {
      window.open(node.path, '_blank')
    }
  } else {
    router.push(node.path)
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
