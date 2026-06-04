<script setup lang="ts">
/**
 * AppLayout — Portal 全局导航布局
 *
 * 职责：
 * - 顶部导航栏：Logo + 模块切换菜单 + 版本号/GitHub
 * - 响应式：移动端汉堡菜单 + 侧边抽屉
 * - 作为路由布局容器，子路由通过 <router-view /> 渲染
 *
 * 设计原则：
 * - 纯布局组件，不包含业务逻辑
 * - CSS Modules 样式隔离
 * - 导航项通过路由配置驱动
 */
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close, Promotion } from '@element-plus/icons-vue'
import styles from './AppLayout.module.css'

const route = useRoute()
const router = useRouter()

/** 移动端抽屉开关 */
const drawerVisible = ref(false)

/** 导航项定义 */
interface NavItem {
  path: string
  label: string
}

const navItems: NavItem[] = [
  { path: '/', label: '首页' },
  { path: '/editor', label: '编辑器' },
  { path: '/flow', label: '流程' },
  { path: '/ai', label: 'AI' },
]

/** 当前激活的导航项 */
const activeNav = computed(() => {
  const path = route.path
  if (path === '/') return '/'
  const match = navItems.find((item) => item.path !== '/' && path.startsWith(item.path))
  return match?.path ?? '/'
})

/** 版本号 */
const version = 'v1.0.0'

/** GitHub 链接 */
const githubUrl = 'https://github.com/nicknisi/schema-form-platform'

/** 导航到指定路由 */
function navigateTo(path: string): void {
  router.push(path)
  drawerVisible.value = false
}

/** 打开移动端抽屉 */
function openDrawer(): void {
  drawerVisible.value = true
}

/** 关闭移动端抽屉 */
function closeDrawer(): void {
  drawerVisible.value = false
}
</script>

<template>
  <div :class="styles.layout">
    <!-- 顶部导航栏 -->
    <header :class="styles.header">
      <div :class="styles.headerInner">
        <!-- 左侧：Logo + 平台名称 -->
        <router-link to="/" :class="styles.logoArea">
          <div :class="styles.logoIcon">P</div>
          <span :class="styles.logoText">PyFlow</span>
        </router-link>

        <!-- 中间：模块切换菜单（桌面端） -->
        <nav :class="styles.nav">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            :class="[styles.navItem, { [styles.navItemActive]: activeNav === item.path }]"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <!-- 右侧：版本号 + GitHub -->
        <div :class="styles.headerRight">
          <span :class="styles.version">{{ version }}</span>
          <a
            :class="styles.githubLink"
            :href="githubUrl"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
          >
            <el-icon :size="18"><Promotion /></el-icon>
          </a>
          <!-- 移动端汉堡按钮 -->
          <button
            :class="styles.hamburger"
            aria-label="打开导航菜单"
            @click="openDrawer"
          >
            <el-icon :size="20"><Promotion /></el-icon>
          </button>
        </div>
      </div>
    </header>

    <!-- 移动端遮罩层 -->
    <div
      :class="[styles.mobileOverlay, { [styles.mobileOverlayOpen]: drawerVisible }]"
      @click="closeDrawer"
    />

    <!-- 移动端侧边抽屉 -->
    <aside
      :class="[styles.mobileNav, { [styles.mobileNavOpen]: drawerVisible }]"
      role="dialog"
      aria-label="导航菜单"
    >
      <div :class="styles.mobileNavHeader">
        <span :class="styles.logoText">PyFlow</span>
        <button
          :class="styles.mobileNavClose"
          aria-label="关闭导航菜单"
          @click="closeDrawer"
        >
          <el-icon :size="18"><Close /></el-icon>
        </button>
      </div>
      <nav :class="styles.mobileNavList">
        <a
          v-for="item in navItems"
          :key="item.path"
          :class="[styles.mobileNavItem, { [styles.mobileNavItemActive]: activeNav === item.path }]"
          @click="navigateTo(item.path)"
        >
          {{ item.label }}
        </a>
      </nav>
      <div :class="styles.mobileNavFooter">
        <span :class="styles.mobileVersion">{{ version }}</span>
      </div>
    </aside>

    <!-- 主内容区域 -->
    <main :class="styles.main">
      <router-view />
    </main>
  </div>
</template>
