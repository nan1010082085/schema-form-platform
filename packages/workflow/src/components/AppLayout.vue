<script setup lang="ts">
/**
 * AppLayout — Workflow 主布局
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, List, Monitor, SetUp } from '@element-plus/icons-vue'
import styles from './AppLayout.module.scss'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/workflows', label: '工作流', icon: SetUp },
  { path: '/templates', label: '模板库', icon: Document },
  { path: '/executions', label: '执行记录', icon: Monitor },
]

const activeNav = computed(() => {
  const path = route.path
  if (path.startsWith('/templates')) return '/templates'
  if (path.startsWith('/executions')) return '/executions'
  return '/workflows'
})
</script>

<template>
  <div :class="styles.layout">
    <aside :class="styles.sidebar">
      <div :class="styles.logo" @click="router.push('/workflows')">
        <span :class="styles.logoText">Workflow</span>
      </div>
      <nav :class="styles.nav">
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
    <main :class="styles.main">
      <router-view />
    </main>
  </div>
</template>
