<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/utils/apiClient'
import { useQiankun } from '@schema-form/shared-qiankun'
import { useAuthStore } from '../stores/auth'
import { resolveIconName } from '@schema-form/shared-utils/iconResolver'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

interface MenuItem {
  id: string
  name: string
  path: string
  icon: string
  permission?: string
  microAppId: string | null
  target: '_self' | '_blank'
  children?: MenuItem[]
}

const route = useRoute()
const router = useRouter()
const { getGlobalState } = useQiankun()
const isCollapsed = ref(false)
const menuItems = ref<MenuItem[]>([])

const activeMenu = computed(() => route.name as string)
const pageTitle = computed(() => (route.meta?.title as string) || '系统管理')

async function fetchMenus() {
  try {
    // 先加载用户权限
    const authStore = useAuthStore()
    await authStore.loadUser()

    const data = await apiClient.get<MenuItem[]>('/menus?tree=true&type=menu&status=active')
    const all = Array.isArray(data) ? data : []
    // 过滤：系统管理相关菜单 + 权限过滤
    menuItems.value = all.filter(item => {
      if (item.microAppId && item.microAppId !== 'admin') return false
      // 有权限要求时检查权限
      if (item.permission && !authStore.hasPermission(item.permission)) return false
      // 子菜单也需要过滤
      if (item.children) {
        item.children = item.children.filter(child => {
          if (child.permission && !authStore.hasPermission(child.permission)) return false
          return true
        })
      }
      return true
    })
  } catch {
    menuItems.value = []
  }
}

function openHome() {
  window.open('/schema-platform/', '_blank')
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
  <div :class="$style.layout">
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
              <AppIcon :name="resolveIconName(item.icon)" :size="18" />
              <span>{{ item.name }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.id"
              :index="child.path"
              @click="handleMenuClick(child)"
            >
              <AppIcon :name="resolveIconName(child.icon)" :size="18" />
              {{ child.name }}
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item
            v-else
            :index="item.path"
            @click="handleMenuClick(item)"
          >
            <AppIcon :name="resolveIconName(item.icon)" :size="18" />
            {{ item.name }}
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
            <AppIcon :name="isCollapsed ? 'expand' : 'fold'" :size="20" />
          </el-button>
          <h2 :class="$style.pageTitle">{{ pageTitle }}</h2>
        </div>
        <div :class="$style.headerRight">
          <el-button text @click="openHome">返回首页</el-button>
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
  background: var(--bg-color-page);
}

.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-color-page);
}

/* ── 侧边栏：浅色底（对齐 editor / flow 风格） ─────────── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-color-white);
  border-right: 1px solid var(--border-color-base);
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
  color: var(--text-color-title);
  border-bottom: 1px solid var(--border-color-base);
  white-space: nowrap;
  letter-spacing: 1px;
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
  background: var(--bg-color-page);
}

/* ── 头部栏：浅色底 ───────────────────────────────────── */
.header {
  height: 56px;
  background: var(--bg-color-white);
  border-bottom: 1px solid var(--border-color-base);
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
  color: var(--text-color-title);
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
