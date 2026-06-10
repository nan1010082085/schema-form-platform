<script setup lang="ts">
/**
 * AppLayout — Portal 全局侧边栏布局
 *
 * 职责：
 * - 左侧菜单栏：Logo + 动态菜单树 + 折叠按钮
 * - 顶部栏：面包屑 / 搜索 / 用户信息
 * - 根据用户权限从 /api/menus/route 动态获取菜单
 * - 支持侧边栏展开/折叠
 * - 作为路由布局容器，子路由通过 <router-view /> 渲染
 *
 * 设计原则：
 * - 纯布局组件，不包含业务逻辑
 * - CSS Modules 样式隔离
 * - 菜单数据通过 useMenu composable 获取
 */
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChatLineSquare,
  Connection,
  Document,
  Edit,
  Expand,
  Folder,
  Fold,
  HomeFilled,
  Key,
  Loading,
  Menu,
  Setting,
  User,
  UserFilled,
} from '@element-plus/icons-vue'
import { useMenu } from '@/composables/useMenu'
import { useSidebar } from '@/composables/useSidebar'
import { useAuth } from '@/composables/useAuth'
import GlobalSearch from '@/components/GlobalSearch.vue'
import type { MenuTreeNode } from '@/types/menu'
import styles from './AppLayout.module.css'

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()
const { menuTree, loading: menuLoading, error: menuError, fetchMenus, reset: resetMenu } = useMenu()
const { collapsed, toggleCollapse, toggleSubmenu, isSubmenuOpen, closeAllSubmenus } = useSidebar()

// 登录后获取菜单
fetchMenus()

// 折叠侧边栏时关闭所有子菜单
watch(collapsed, (val) => {
  if (val) closeAllSubmenus()
})

/** 图标名称到组件的映射（运行时动态图标） */
const iconMap: Record<string, typeof Document> = {
  HomeFilled,
  Edit,
  Connection,
  ChatLineSquare,
  User,
  UserFilled,
  Folder,
  Menu,
  Document,
  Setting,
  Key,
}

/** 判断菜单项是否为当前激活路由 */
function isActive(node: MenuTreeNode): boolean {
  if (!node.path) return false
  const p = route.path
  return p === node.path || p.startsWith(node.path + '/')
}

/** 判断菜单项是否有激活的子路由 */
function hasActiveChild(node: MenuTreeNode): boolean {
  if (!node.children?.length) return false
  return node.children.some(child => isActive(child) || hasActiveChild(child))
}

/** 导航到菜单路由 */
function navigateTo(node: MenuTreeNode): void {
  if (!node.path) return
  // 子应用路由（editor/flow/ai）在新标签页打开
  if (['/editor', '/flow', '/ai'].some(prefix => node.path.startsWith(prefix))) {
    window.open(node.path, '_blank')
    return
  }
  router.push(node.path)
}

/** 处理菜单项点击 */
function handleMenuClick(node: MenuTreeNode): void {
  if (node.children?.length) {
    // 有子菜单：切换展开
    if (collapsed.value) return // 折叠态不处理子菜单点击
    toggleSubmenu(node.id)
  } else {
    // 叶子节点：导航
    navigateTo(node)
  }
}

/** 退出登录 */
async function handleLogout(): Promise<void> {
  resetMenu()
  await logout()
}

/** 版本号 */
const version = 'v1.0.0'
</script>

<template>
  <div :class="styles.layout">
    <!-- 左侧菜单栏 -->
    <aside :class="[styles.sidebar, { [styles.sidebarCollapsed]: collapsed }]">
      <!-- Logo 区域 -->
      <div :class="styles.sidebarHeader">
        <router-link to="/" :class="styles.logoArea">
          <div :class="styles.logoIcon">P</div>
          <span v-show="!collapsed" :class="styles.logoText">Schema Form</span>
        </router-link>
      </div>

      <!-- 菜单列表 -->
      <nav :class="styles.menuNav">
        <!-- 加载状态 -->
        <div v-if="menuLoading" :class="styles.menuLoading">
          <el-icon :size="20" :class="styles.spinIcon"><Loading /></el-icon>
          <span v-show="!collapsed" :class="styles.menuLoadingText">加载中...</span>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="menuError" :class="styles.menuError">
          <span v-show="!collapsed" :class="styles.menuErrorText">{{ menuError }}</span>
          <el-button link size="small" @click="fetchMenus">重试</el-button>
        </div>

        <!-- 首页入口 -->
        <div
          v-if="!menuLoading && !menuError"
          :class="[styles.menuItem, { [styles.menuItemActive]: route.path === '/' }]"
          @click="router.push('/')"
        >
          <el-icon :size="18"><HomeFilled /></el-icon>
          <span v-show="!collapsed" :class="styles.menuLabel">首页</span>
        </div>

        <!-- 动态菜单树 -->
        <template v-if="!menuLoading && !menuError">
          <div v-for="node in menuTree" :key="node.id">
            <!-- 一级菜单项 -->
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
              <el-icon :size="18">
                <component :is="iconMap[node.icon] || 'Document'" />
              </el-icon>
              <span v-show="!collapsed" :class="styles.menuLabel">{{ node.name }}</span>
              <!-- 展开箭头 -->
              <el-icon
                v-if="node.children?.length && !collapsed"
                :class="[styles.menuArrow, { [styles.menuArrowOpen]: isSubmenuOpen(node.id) }]"
                :size="12"
              >
                <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path d="M384 192l256 320-256 320z" />
                </svg>
              </el-icon>
            </div>

            <!-- 二级菜单（展开态） -->
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

      <!-- 折叠按钮 -->
      <div :class="styles.sidebarFooter" @click="toggleCollapse">
        <el-icon :size="16">
          <Expand v-if="collapsed" />
          <Fold v-else />
        </el-icon>
        <span v-show="!collapsed" :class="styles.collapseText">收起菜单</span>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <div :class="styles.contentArea">
      <!-- 顶部栏 -->
      <header :class="styles.header">
        <div :class="styles.headerLeft">
          <!-- 移动端汉堡按钮（仅移动端显示） -->
          <button :class="styles.mobileMenuBtn" @click="toggleCollapse">
            <el-icon :size="20"><Fold /></el-icon>
          </button>
          <GlobalSearch />
        </div>
        <div :class="styles.headerRight">
          <span :class="styles.version">{{ version }}</span>
          <el-dropdown trigger="click">
            <div :class="styles.userArea">
              <div :class="styles.userAvatar">
                {{ user?.username?.charAt(0)?.toUpperCase() || 'U' }}
              </div>
              <span :class="styles.userName">{{ user?.username || '未登录' }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 主内容区域 -->
      <main :class="styles.main">
        <router-view />
      </main>
    </div>
  </div>
</template>
