<script setup lang="ts">
/**
 * AppLayout — 全局布局壳
 *
 * 侧边栏导航 + 主内容区。编辑器/预览/发布页不使用此布局。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, Setting, DataBoard } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/instances', label: '实例管理', icon: DataBoard },
  { path: '/docs', label: '组件文档', icon: Document },
]

const activeNav = computed(() => {
  if (route.path.startsWith('/docs')) return '/docs'
  return route.path
})
</script>

<template>
  <div :class="$style.layout">
    <!-- 侧边栏 -->
    <aside :class="$style.sidebar">
      <div :class="$style.logo" @click="router.push('/instances')">
        <span :class="$style.logoText">Schema Form</span>
      </div>

      <nav :class="$style.nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="[$style.navItem, activeNav === item.path && $style.navItemActive]"
        >
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div :class="$style.sidebarFooter">
        <router-link
          to="/settings"
          :class="[$style.navItem, route.path === '/settings' && $style.navItemActive]"
        >
          <el-icon :size="18"><Setting /></el-icon>
          <span>设置</span>
        </router-link>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main :class="$style.main">
      <router-view />
    </main>
  </div>
</template>

<style module>
.layout {
  display: flex;
  height: 100vh;
  background: #f0f2f5;
}

.sidebar {
  width: 200px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.logo {
  padding: 20px 20px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f2f5;
}

.logoText {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  letter-spacing: -0.5px;
}

.nav {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.navItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: #606266;
  text-decoration: none;
  transition: all 0.15s;
  cursor: pointer;
}

.navItem:hover {
  background: #f5f7fa;
  color: #303133;
}

.navItemActive {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 500;
}

.sidebarFooter {
  padding: 8px;
  border-top: 1px solid #f0f2f5;
}

.main {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
</style>
