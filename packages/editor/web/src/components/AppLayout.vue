<script setup lang="ts">
/**
 * AppLayout — 全局布局壳
 *
 * 侧边栏导航 + 主内容区。编辑器/预览/发布页不使用此布局。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, DataBoard } from '@element-plus/icons-vue'
import styles from './AppLayout.module.scss'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/instances', label: '实例管理', icon: DataBoard },
  { path: '/docs', label: '部件文档', icon: Document },
]

const activeNav = computed(() => {
  if (route.path.startsWith('/docs')) return '/docs'
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
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- 主内容区 -->
    <main :class="styles.main">
      <router-view />
    </main>
  </div>
</template>
