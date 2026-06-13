<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/utils/apiClient'
import { useQiankun } from '@schema-form/shared-qiankun'
import {
  DesktopIcon,
  MenuIcon,
  UserIcon,
  UserCircleIcon,
  BuildingIcon,
  BriefcaseIcon,
  BookmarkIcon,
  SettingIcon,
  FileIcon,
} from 'tdesign-icons-vue-next'

const ICON_MAP: Record<string, any> = {
  Desktop: DesktopIcon,
  Menu: MenuIcon,
  User: UserIcon,
  UserCircle: UserCircleIcon,
  Building: BuildingIcon,
  Briefcase: BriefcaseIcon,
  Bookmark: BookmarkIcon,
  Setting: SettingIcon,
  File: FileIcon,
}

interface MenuItem {
  id: string
  name: string
  path: string
  icon: string
  target: '_self' | '_blank'
  children?: MenuItem[]
}

const route = useRoute()
const router = useRouter()
const { getGlobalState } = useQiankun()
const isCollapsed = ref(false)
const menuItems = ref<MenuItem[]>([])

/** 微前端模式下隐藏侧边栏，由宿主 shell 提供导航 */
const isQiankun = () => !!window.__POWERED_BY_QIANKUN__

const activeMenu = computed(() => route.name as string)
const pageTitle = computed(() => (route.meta?.title as string) || '系统管理')

async function fetchMenus() {
  try {
    const data = await apiClient.get<MenuItem[]>('/menus?tree=true&type=menu&status=active')
    menuItems.value = Array.isArray(data) ? data : []
  } catch {
    menuItems.value = []
  }
}

function getMenuIcon(iconName: string) {
  return ICON_MAP[iconName] || DesktopIcon
}

function openPortal() {
  window.open('/', '_blank')
}

function handleMenuClick(item: MenuItem) {
  if (item.target === '_blank') {
    const state = getGlobalState()
    const token = (state.token as string) || localStorage.getItem('sfp_access_token')
    const url = item.path.startsWith('http')
      ? item.path
      : `${window.location.origin}${item.path.startsWith('/') ? '' : '/'}${item.path}`
    const separator = url.includes('?') ? '&' : '?'
    const fullUrl = token ? `${url}${separator}token=${encodeURIComponent(token)}` : url
    window.open(fullUrl, '_blank')
    return
  }
  router.push(item.path)
}

onMounted(fetchMenus)
</script>

<template>
  <!-- 微前端模式：只渲染内容区，侧边栏由宿主 shell 提供 -->
  <div v-if="isQiankun()" :class="$style.embedContent">
    <RouterView />
  </div>

  <!-- standalone 模式：完整布局 -->
  <div v-else :class="$style.layout">
    <!-- 侧边栏 -->
    <aside :class="[$style.sidebar, { [$style.sidebarCollapsed]: isCollapsed }]">
      <div :class="$style.logo">
        <span v-if="!isCollapsed">系统管理</span>
        <span v-else>管</span>
      </div>
      <t-menu
        :value="activeMenu"
        :collapsed="isCollapsed"
        :class="$style.menu"
      >
        <template v-for="item in menuItems" :key="item.id">
          <t-submenu v-if="item.children?.length" :value="item.id">
            <template #title>
              <component :is="getMenuIcon(item.icon)" />
              <span>{{ item.name }}</span>
            </template>
            <t-menu-item
              v-for="child in item.children"
              :key="child.id"
              :value="child.path"
              @click="handleMenuClick(child)"
            >
              <template #icon>
                <component :is="getMenuIcon(child.icon)" />
              </template>
              {{ child.name }}
            </t-menu-item>
          </t-submenu>
          <t-menu-item
            v-else
            :value="item.path"
            @click="handleMenuClick(item)"
          >
            <template #icon>
              <component :is="getMenuIcon(item.icon)" />
            </template>
            {{ item.name }}
          </t-menu-item>
        </template>
      </t-menu>
    </aside>

    <!-- 主内容区 -->
    <div :class="$style.main">
      <!-- 顶部栏 -->
      <header :class="$style.header">
        <div :class="$style.headerLeft">
          <t-button
            variant="text"
            :class="$style.collapseBtn"
            @click="isCollapsed = !isCollapsed"
          >
            <MenuIcon :size="20" />
          </t-button>
          <h2 :class="$style.pageTitle">{{ pageTitle }}</h2>
        </div>
        <div :class="$style.headerRight">
          <t-button variant="text" @click="openPortal">返回门户</t-button>
        </div>
      </header>

      <!-- 页面内容 -->
      <main :class="$style.content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style module>
.embedContent {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--td-bg-color-page);
}

.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--td-bg-color-page);
}

/* ── 侧边栏：深色底 + 右侧发光边框 ──────────────────────── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border-color);
  box-shadow: 1px 0 15px rgba(0, 212, 255, 0.06);
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  overflow: hidden;
}

.sidebarCollapsed {
  width: 64px;
}

/* Logo 区域：霓虹文字 + 发光底边 */
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #00d4ff;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.5), 0 0 20px rgba(0, 212, 255, 0.2);
  border-bottom: 1px solid var(--sidebar-border-color);
  white-space: nowrap;
  letter-spacing: 2px;
}

.menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
}

/* ── 主内容区 ──────────────────────────────────────────── */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--td-bg-color-page);
}

/* ── 头部栏：玻璃拟态 ──────────────────────────────────── */
.header {
  height: 56px;
  background: rgba(17, 24, 32, 0.75);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  border-bottom: 1px solid rgba(0, 212, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapseBtn {
  padding: 4px;
}

.pageTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin: 0;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 8px;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}
</style>

<!-- 非 Module 样式：覆盖侧边栏内 TDesign 菜单组件 -->
<style>
.sidebar .t-menu {
  background: transparent !important;
  border-right: none !important;
}

.sidebar .t-menu .t-menu__item {
  color: var(--sidebar-text-color) !important;
  border-radius: 6px;
  margin: 2px 8px;
  transition: all 0.2s;
}

.sidebar .t-menu .t-menu__item:hover {
  background: var(--sidebar-bg-hover) !important;
  color: var(--td-text-color-primary) !important;
}

.sidebar .t-menu .t-is-active .t-menu__item,
.sidebar .t-menu .t-menu__item.t-is-active {
  background: var(--sidebar-bg-active) !important;
  color: var(--sidebar-text-color-active) !important;
  box-shadow: inset 0 0 12px rgba(0, 212, 255, 0.08);
}

.sidebar .t-menu .t-submenu__title {
  color: var(--sidebar-text-color) !important;
}

.sidebar .t-menu .t-submenu__title:hover {
  background: var(--sidebar-bg-hover) !important;
  color: var(--td-text-color-primary) !important;
}

.sidebar .t-menu .t-submenu.t-is-opened .t-submenu__title {
  color: var(--sidebar-text-color-active) !important;
}

.sidebar .t-menu .t-menu__sub {
  background: rgba(0, 0, 0, 0.15) !important;
}
</style>
