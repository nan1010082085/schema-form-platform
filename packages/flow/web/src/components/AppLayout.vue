<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, List, Finished } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/list', label: '流程列表', icon: Document },
  { path: '/tasks', label: '我的任务', icon: List },
]

const activeNav = computed(() => {
  if (route.path.startsWith('/tasks')) return '/tasks'
  if (route.path.startsWith('/list')) return '/list'
  return route.path
})
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo" @click="router.push('/list')">
        <span class="logoText">流程引擎</span>
      </div>
      <nav class="nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="navItem"
          :class="{ navItemActive: activeNav === item.path }"
        >
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidebarFooter">
        <a class="navItem" href="/portal/" style="text-decoration:none;color:inherit;">
          <el-icon :size="18"><Finished /></el-icon>
          <span>返回首页</span>
        </a>
      </div>
    </aside>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.layout { display: flex; height: 100vh; background: #f0f2f5; }
.sidebar { width: 200px; background: #fff; border-right: 1px solid #e8e8e8; display: flex; flex-direction: column; flex-shrink: 0; }
.logo { padding: 20px 20px 16px; cursor: pointer; border-bottom: 1px solid #f0f2f5; }
.logoText { font-size: 16px; font-weight: 700; color: #303133; }
.nav { flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
.navItem { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; font-size: 14px; color: #606266; text-decoration: none; transition: all 0.15s; cursor: pointer; }
.navItem:hover { background: #f5f7fa; color: #303133; }
.navItemActive { background: #ecf5ff; color: var(--el-color-primary); font-weight: 500; }
.sidebarFooter { padding: 8px; border-top: 1px solid #f0f2f5; }
.main { flex: 1; min-width: 0; overflow: auto; }
</style>
