<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/utils/apiClient'
import { resolveToken } from '@schema-form/micro-app/child'
import {
  Monitor,
  Menu as MenuIcon,
  User,
  UserFilled,
  OfficeBuilding,
  Briefcase,
  Collection,
  Setting,
  Document,
} from '@element-plus/icons-vue'

const ICON_MAP: Record<string, typeof Monitor> = {
  Monitor,
  Menu: MenuIcon,
  User,
  UserFilled,
  OfficeBuilding,
  Briefcase,
  Collection,
  Setting,
  Document,
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
const isCollapsed = ref(false)
const menuItems = ref<MenuItem[]>([])

/** 微前端模式下隐藏侧边栏，由宿主 portal 提供导航 */
const isMicroApp = () => !!window.__MICRO_APP_ENVIRONMENT__

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
  return ICON_MAP[iconName] || Monitor
}

function openPortal() {
  window.open('/', '_blank')
}

function handleMenuClick(item: MenuItem) {
  if (item.target === '_blank') {
    const token = resolveToken()
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
  <!-- 微前端模式：只渲染内容区，侧边栏由宿主 portal 提供 -->
  <div v-if="isMicroApp()" :class="$style.embedContent">
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
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :class="$style.menu"
      >
        <template v-for="item in menuItems" :key="item.id">
          <el-sub-menu v-if="item.children?.length" :index="item.id">
            <template #title>
              <el-icon><component :is="getMenuIcon(item.icon)" /></el-icon>
              <span>{{ item.name }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.id"
              :index="child.path"
              @click="handleMenuClick(child)"
            >
              <el-icon><component :is="getMenuIcon(child.icon)" /></el-icon>
              <template #title>{{ child.name }}</template>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item
            v-else
            :index="item.path"
            @click="handleMenuClick(item)"
          >
            <el-icon><component :is="getMenuIcon(item.icon)" /></el-icon>
            <template #title>{{ item.name }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </aside>

    <!-- 主内容区 -->
    <div :class="$style.main">
      <!-- 顶部栏 -->
      <header :class="$style.header">
        <div :class="$style.headerLeft">
          <el-button
            text
            :class="$style.collapseBtn"
            @click="isCollapsed = !isCollapsed"
          >
            <el-icon :size="20">
              <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="currentColor"
                  d="M128 192h768a42.666667 42.666667 0 0 0 0-85.333333H128a42.666667 42.666667 0 0 0 0 85.333333z m768 298.666667H128a42.666667 42.666667 0 0 0 0 85.333333h768a42.666667 42.666667 0 0 0 0-85.333333z m0 384H128a42.666667 42.666667 0 0 0 0 85.333333h768a42.666667 42.666667 0 0 0 0-85.333333z"
                />
              </svg>
            </el-icon>
          </el-button>
          <h2 :class="$style.pageTitle">{{ pageTitle }}</h2>
        </div>
        <div :class="$style.headerRight">
          <el-button text @click="openPortal">返回门户</el-button>
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
  background: var(--el-fill-color-lighter);
}

.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  overflow: hidden;
}

.sidebarCollapsed {
  width: 64px;
}

.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--el-color-primary);
  border-bottom: 1px solid var(--el-border-color-lighter);
  white-space: nowrap;
}

.menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--el-fill-color-lighter);
}

.header {
  height: 56px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
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
  color: var(--el-text-color-primary);
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
