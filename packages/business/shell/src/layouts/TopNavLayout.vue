/**
 * 顶部导航栏布局
 *
 * 风格 B: 顶部水平导航 + 内容区
 * 适用于门户、SaaS 产品、轻量级应用
 */

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMenu } from '@/composables/useMenu'
import UserDropdown from '@/components/UserDropdown.vue'
import GlobalSearch from '@/components/GlobalSearch.vue'
import LayoutSwitcher from '@schema-form/business-shared/components/LayoutSwitcher.vue'
import type { MenuTreeNode } from '@/types/menu'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const { menuTree } = useMenu()

const withoutMenu = computed(() => route.meta?.withoutMenu === true)

function isActive(node: MenuTreeNode): boolean {
  if (!node.path) return false
  const p = route.path
  return p === node.path || p.startsWith(node.path + '/')
}

function navigateTo(node: MenuTreeNode) {
  if (!node.path) return
  router.push(node.path)
}
</script>

<template>
  <!-- 无菜单模式：全屏微应用 -->
  <div v-if="withoutMenu" :class="$style.layout">
    <main :class="$style.main">
      <router-view />
    </main>
  </div>

  <!-- 顶部导航布局 -->
  <div v-else :class="$style.layout">
    <!-- 顶部导航栏 -->
    <header :class="$style.header">
      <!-- 左侧 Logo -->
      <div :class="$style.headerLeft">
        <router-link to="/" :class="$style.logo">
          <div :class="$style.logoIcon">S</div>
          <span :class="$style.logoText">表单设计器</span>
        </router-link>
      </div>

      <!-- 中间导航菜单 -->
      <nav :class="$style.nav">
        <template v-for="node in menuTree" :key="node.id">
          <!-- 无子菜单 -->
          <div
            v-if="!node.children?.length"
            :class="[
              $style.navItem,
              { [$style.navItemActive]: isActive(node) }
            ]"
            @click="navigateTo(node)"
          >
            {{ node.name }}
          </div>

          <!-- 有子菜单 -->
          <el-dropdown v-else trigger="click">
            <div
              :class="[
                $style.navItem,
                { [$style.navItemActive]: isActive(node) }
              ]"
            >
              {{ node.name }}
              <AppIcon name="arrow-down" :size="12" />
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="child in node.children"
                  :key="child.id"
                  @click="navigateTo(child)"
                >
                  {{ child.name }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </nav>

      <!-- 右侧操作区 -->
      <div :class="$style.headerRight">
        <GlobalSearch />
        <LayoutSwitcher />
        <UserDropdown />
      </div>
    </header>

    <!-- 主内容区 -->
    <main :class="$style.main">
      <router-view />
    </main>
  </div>
</template>

<style module>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-color-page);
}

.header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  background: var(--topnav-bg, rgba(17, 24, 32, 0.95));
  backdrop-filter: var(--glass-blur, blur(20px));
  -webkit-backdrop-filter: var(--glass-blur, blur(20px));
  border-bottom: 1px solid var(--border-color-light, rgba(255, 255, 255, 0.1));
  box-shadow: var(--shadow-sm, 0 1px 10px rgba(0, 0, 0, 0.05));
  flex-shrink: 0;
  z-index: 100;
}

.headerLeft {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  text-decoration: none;
}

.logoIcon {
  width: 36px;
  height: 36px;
  border-radius: var(--border-radius-sm);
  background: var(--gradient-primary, linear-gradient(135deg, #00d4ff 0%, #009fcc 100%));
  color: var(--text-color-inverse, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: var(--glow-primary, 0 0 10px rgba(0, 212, 255, 0.3));
}

.logoText {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color-primary, rgba(255, 255, 255, 0.9));
  white-space: nowrap;
}

.nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex: 1;
  justify-content: center;
}

.navItem {
  height: 64px;
  line-height: 64px;
  padding: 0 var(--spacing-md);
  font-size: 14px;
  color: var(--text-color-secondary, rgba(255, 255, 255, 0.65));
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  position: relative;
}

.navItem:hover {
  color: var(--color-primary);
  background: var(--bg-color-hover, rgba(0, 212, 255, 0.05));
}

.navItemActive {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 500;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.main {
  flex: 1;
  background: var(--bg-color-page);
  background-image:
    linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  overflow: auto;
}

/* 响应式：移动端 */
@media (max-width: 900px) {
  .nav {
    display: none;
  }

  .header {
    padding: 0 var(--spacing-md);
  }
}
</style>
