<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileIcon, OrderListIcon, DesktopIcon, DataIcon, RootListIcon, BarChartIcon } from 'tdesign-icons-vue-next'
import styles from './AppLayout.module.scss'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/list', label: '流程列表', icon: FileIcon },
  { path: '/instances', label: '流程实例', icon: DesktopIcon },
  { path: '/tasks', label: '我的任务', icon: OrderListIcon },
  { path: '/monitor', label: '流程监控', icon: DataIcon },
  { path: '/templates', label: '流程模板', icon: RootListIcon },
  { path: '/stats', label: '流程统计', icon: BarChartIcon },
]

const activeNav = computed(() => {
  const path = route.path
  if (path.startsWith('/instances') || path.startsWith('/instance/')) return '/instances'
  if (path.startsWith('/tasks')) return '/tasks'
  if (path.startsWith('/monitor')) return '/monitor'
  if (path.startsWith('/templates')) return '/templates'
  if (path.startsWith('/stats')) return '/stats'
  if (path.startsWith('/list')) return '/list'
  return path
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
          <component :is="item.icon" style="font-size: 18px;" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>
    <main :class="styles.main" data-test="main">
      <router-view />
    </main>
  </div>
</template>
