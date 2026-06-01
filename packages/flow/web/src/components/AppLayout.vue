<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, List, Finished, Monitor } from '@element-plus/icons-vue'
import styles from './AppLayout.module.scss'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/list', label: '流程列表', icon: Document },
  { path: '/instances', label: '流程实例', icon: Monitor },
  { path: '/tasks', label: '我的任务', icon: List },
]

const activeNav = computed(() => {
  if (route.path.startsWith('/tasks')) return '/tasks'
  if (route.path.startsWith('/instances')) return '/instances'
  if (route.path.startsWith('/list')) return '/list'
  return route.path
})
</script>

<template>
  <div :class="styles.layout">
    <aside :class="styles.sidebar" data-test="sidebar">
      <div :class="styles.logo" data-test="logo" @click="router.push('/list')">
        <span :class="styles.logoText">流程引擎</span>
      </div>
      <nav :class="styles.nav" data-test="nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="[styles.navItem, { [styles.navItemActive]: activeNav === item.path }]"
        >
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div :class="styles.sidebarFooter" data-test="sidebar-footer">
        <a :class="styles.navItem" href="/portal/">
          <el-icon :size="18"><Finished /></el-icon>
          <span>返回首页</span>
        </a>
      </div>
    </aside>
    <main :class="styles.main" data-test="main">
      <router-view />
    </main>
  </div>
</template>
