<script setup lang="ts">
/**
 * AppLayout — 全局布局壳
 *
 * 侧边栏导航 + 主内容区。编辑器/预览/发布页不使用此布局。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DashboardIcon, AppIcon, DesktopIcon, SettingIcon } from 'tdesign-icons-vue-next'
import BreadcrumbNav from './BreadcrumbNav.vue'
import styles from './AppLayout.module.scss'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/instances', label: '实例管理', icon: DashboardIcon },
  { path: '/templates', label: '模板库', icon: AppIcon },
  { path: '/workflows', label: '工作流管理', icon: SettingIcon },
  { path: '/workflow-monitor', label: '工作流监控', icon: DesktopIcon },
]

const activeNav = computed(() => {
  if (route.path.startsWith('/templates')) return '/templates'
  if (route.path.startsWith('/workflows')) return '/workflows'
  if (route.path.startsWith('/workflow-monitor')) return '/workflow-monitor'
  return route.path
})
</script>

<template>
  <div :class="styles.layout">
    <!-- 侧边栏 -->
    <aside :class="styles.sidebar">
      <div :class="styles.logo" @click="router.push('/instances')">
        <span :class="styles.logoText">可视化编辑器</span>
      </div>

      <nav :class="styles.nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="[styles.navItem, activeNav === item.path && styles.navItemActive]"
        >
          <component :is="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- 主内容区 -->
    <main :class="styles.main">
      <BreadcrumbNav />
      <router-view />
    </main>
  </div>
</template>
