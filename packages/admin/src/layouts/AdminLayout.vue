<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'
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

const route = useRoute()
const isCollapsed = ref(false)

const menuItems = [
  { name: 'micro-apps', path: '/micro-apps', label: '微应用管理', icon: Monitor },
  { name: 'menus', path: '/menus', label: '菜单管理', icon: MenuIcon },
  { name: 'users', path: '/users', label: '用户管理', icon: User },
  { name: 'roles', path: '/roles', label: '角色管理', icon: UserFilled },
  { name: 'depts', path: '/depts', label: '部门管理', icon: OfficeBuilding },
  { name: 'posts', path: '/posts', label: '岗位管理', icon: Briefcase },
  { name: 'dict', path: '/dict', label: '字典管理', icon: Collection },
  { name: 'config', path: '/config', label: '参数设置', icon: Setting },
  { name: 'logs', path: '/logs', label: '操作日志', icon: Document },
]

const activeMenu = computed(() => route.name as string)
const pageTitle = computed(() => (route.meta?.title as string) || '系统管理')
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
        router
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.name"
          :index="item.name"
          :route="{ name: item.name }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
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
          <el-button text @click="window.open('/', '_blank')">返回门户</el-button>
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
