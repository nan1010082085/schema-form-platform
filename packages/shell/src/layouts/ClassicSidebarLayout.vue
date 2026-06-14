/**
 * 经典侧边栏布局
 *
 * 风格 A: 深色侧边栏 + 顶部 Header + 内容区
 * 适用于管理后台、B 端系统
 */

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLayoutStore } from '@schema-form/shared-stores/layout'
import SideMenu from '@/components/SideMenu.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import UserDropdown from '@/components/UserDropdown.vue'
import GlobalSearch from '@/components/GlobalSearch.vue'
import LayoutSwitcher from '@schema-form/shared-components/LayoutSwitcher.vue'

const route = useRoute()
const layoutStore = useLayoutStore()

// 恢复折叠状态
layoutStore.restoreCollapsed()

const withoutMenu = computed(() => route.meta?.withoutMenu === true)

function toggleCollapse() {
  layoutStore.toggleCollapse()
}
</script>

<template>
  <!-- 无菜单模式：全屏微应用 -->
  <div v-if="withoutMenu" :class="$style.layout">
    <main :class="$style.main">
      <router-view />
    </main>
  </div>

  <!-- 侧边栏布局 -->
  <div v-else :class="$style.layout">
    <!-- 深色侧边栏 -->
    <SideMenu
      :collapsed="layoutStore.collapsed"
      @toggle-collapse="toggleCollapse"
    />

    <!-- 内容区 -->
    <div :class="$style.contentArea">
      <!-- 顶部 Header -->
      <header :class="$style.header">
        <div :class="$style.headerLeft">
          <!-- 移动端菜单按钮 -->
          <t-button
            :class="$style.mobileMenuBtn"
            variant="text"
            shape="square"
            @click="toggleCollapse"
          >
            <t-icon name="menu" />
          </t-button>

          <!-- 面包屑 -->
          <Breadcrumb />
        </div>

        <div :class="$style.headerRight">
          <!-- 全局搜索 -->
          <GlobalSearch />

          <!-- 布局切换 -->
          <LayoutSwitcher />

          <!-- 用户下拉 -->
          <UserDropdown />
        </div>
      </header>

      <!-- 主内容区 -->
      <main :class="$style.main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style module>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--td-bg-color-page);
}

.contentArea {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--td-comp-margin-xl, 20px);
  background: var(--topnav-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--td-border-level-2-color);
  flex-shrink: 0;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: var(--td-comp-margin-m, 8px);
}

.headerRight {
  display: flex;
  align-items: center;
  gap: var(--td-comp-margin-l, 16px);
}

.mobileMenuBtn {
  display: none;
}

.main {
  flex: 1;
  overflow: auto;
  background: var(--td-bg-color-page);
  background-image:
    linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}

/* 响应式：移动端 */
@media (max-width: 900px) {
  .mobileMenuBtn {
    display: flex;
  }
}
</style>
