/**
 * 顶部导航栏布局
 *
 * 风格 B: 顶部水平导航 + 内容区
 * 适用于门户、SaaS 产品、轻量级应用
 */

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLayoutStore } from '@schema-form/shared-stores/layout'
import { useMenu } from '@/composables/useMenu'
import { useAuth } from '@/composables/useAuth'
import UserDropdown from '@/components/UserDropdown.vue'
import GlobalSearch from '@/components/GlobalSearch.vue'
import LayoutSwitcher from '@schema-form/shared-components/LayoutSwitcher.vue'
import type { MenuTreeNode } from '@/types/menu'

const route = useRoute()
const router = useRouter()
const layoutStore = useLayoutStore()
const { menuTree } = useMenu()
const { user } = useAuth()

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
          <t-dropdown v-else trigger="click">
            <div
              :class="[
                $style.navItem,
                { [$style.navItemActive]: isActive(node) }
              ]"
            >
              {{ node.name }}
              <t-icon name="chevron-down" :size="12" />
            </div>
            <template #dropdown>
              <t-dropdown-menu>
                <t-dropdown-item
                  v-for="child in node.children"
                  :key="child.id"
                  @click="navigateTo(child)"
                >
                  {{ child.name }}
                </t-dropdown-item>
              </t-dropdown-menu>
            </template>
          </t-dropdown>
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
@import '@schema-form/shared-styles/theme-tech.css';

.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--td-bg-color-page);
}

.header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--td-comp-margin-xxl, 24px);
  background: rgba(17, 24, 32, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 212, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.05);
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
  gap: var(--td-comp-margin-m, 8px);
  text-decoration: none;
}

.logoIcon {
  width: 36px;
  height: 36px;
  border-radius: var(--td-radius-small, 3px);
  background: linear-gradient(135deg, #00d4ff 0%, #009fcc 100%);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
}

.logoText {
  font-size: 18px;
  font-weight: 600;
  color: var(--td-text-color-primary);
  white-space: nowrap;
}

.nav {
  display: flex;
  align-items: center;
  gap: var(--td-comp-margin-xs, 4px);
  flex: 1;
  justify-content: center;
}

.navItem {
  height: 64px;
  line-height: 64px;
  padding: 0 var(--td-comp-margin-l, 16px);
  font-size: 14px;
  color: var(--td-text-color-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--td-anim-duration-fast, 0.15s);
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  position: relative;
}

.navItem:hover {
  color: #00d4ff;
  background: rgba(0, 212, 255, 0.05);
}

.navItemActive {
  color: #00d4ff;
  border-bottom-color: #00d4ff;
  font-weight: 500;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.headerRight {
  display: flex;
  align-items: center;
  gap: var(--td-comp-margin-l, 16px);
}

.main {
  flex: 1;
  background: var(--td-bg-color-page);
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
    padding: 0 var(--td-comp-margin-l, 16px);
  }
}
</style>
