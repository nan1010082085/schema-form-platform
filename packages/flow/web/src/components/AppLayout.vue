<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, List, Monitor, DataAnalysis } from '@element-plus/icons-vue'
import styles from './AppLayout.module.scss'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/list', label: '流程列表', icon: Document },
  { path: '/instances', label: '流程实例', icon: Monitor },
  { path: '/monitor', label: '流程监控', icon: DataAnalysis },
]

const activeNav = computed(() => {
  const path = route.path
  if (path.startsWith('/instances') || path.startsWith('/instance/')) return '/instances'
  if (path.startsWith('/monitor')) return '/monitor'
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
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>
    <main :class="styles.main" data-test="main">
      <router-view />
    </main>
  </div>
</template>
