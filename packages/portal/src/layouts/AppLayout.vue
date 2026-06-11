<script setup lang="ts">
/**
 * AppLayout — Portal 全局侧边栏布局
 *
 * 职责：
 * - 左侧菜单栏：Logo + 静态导航菜单 + 折叠按钮
 * - 顶部栏：搜索 / 用户信息
 * - 作为路由布局容器，子路由通过 <router-view /> 渲染
 */
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChatLineSquare,
  Connection,
  Document,
  Edit,
  Expand,
  Fold,
  HomeFilled,
  Setting,
  SetUp,
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import GlobalSearch from '@/components/GlobalSearch.vue'
import UserDropdown from '@schema-form/shared-components/navigation/UserDropdown.vue'
import styles from './AppLayout.module.css'

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()

/** 侧边栏折叠状态 */
const collapsed = ref(false)

function toggleCollapse(): void {
  collapsed.value = !collapsed.value
}

interface NavItem {
  label: string
  icon: typeof Edit
  path?: string
  href?: string
}

const navItems: NavItem[] = [
  { label: '首页', icon: HomeFilled, path: '/' },
  { label: '表单编辑器', icon: Edit, path: '/editor' },
  { label: '流程引擎', icon: Connection, path: '/flow' },
  { label: '工作流', icon: SetUp, path: '/workflow' },
  { label: 'AI 助手', icon: ChatLineSquare, path: '/ai' },
  { label: '系统管理', icon: Setting, path: '/admin' },
  { label: '项目文档', icon: Document, href: '/docs/docs.html' },
]

function isActive(item: NavItem): boolean {
  if (!item.path) return false
  return route.path === item.path || route.path.startsWith(item.path + '/')
}

function handleNavClick(item: NavItem): void {
  if (item.href) {
    window.open(item.href, '_blank')
    return
  }
  if (item.path) {
    router.push(item.path)
  }
}
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
        <div
          v-for="item in navItems"
          :key="item.label"
          :class="[styles.menuItem, { [styles.menuItemActive]: isActive(item) }]"
          :title="collapsed ? item.label : undefined"
          @click="handleNavClick(item)"
        >
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <span v-show="!collapsed" :class="styles.menuLabel">{{ item.label }}</span>
        </div>
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
          <UserDropdown :username="user?.username" @logout="logout" />
        </div>
      </header>

      <!-- 主内容区域 -->
      <main :class="styles.main">
        <router-view />
      </main>
    </div>
  </div>
</template>
