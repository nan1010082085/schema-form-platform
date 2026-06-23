<script setup lang="ts">
/**
 * Admin 首页 — 侧边栏菜单 + 内容区
 *
 * 使用项目统一设计令牌（tokens.css），不硬编码颜色。
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import { APP_CONFIGS } from '@schema-form/platform-shared/qiankun/config'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'
import { resolveIconName } from '@schema-form/platform-shared/utils/iconResolver'

interface MenuItem {
  id: string
  name: string
  path: string
  icon: string
  routeType: string
  microAppId?: string
  schemaId?: string
  url?: string
  target?: string
  children?: MenuItem[]
}

const router = useRouter()
const menuTree = ref<MenuItem[]>([])
const loading = ref(true)
const error = ref('')
const activeId = ref<string | null>(null)

async function loadMenus(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    // admin 只加载 app=admin 的菜单（系统管理目录及其子菜单）
    const tree = await apiClient.get<MenuItem[]>('/menus/route?app=admin')
    // 过滤掉目录节点，只显示子菜单
    const systemDir = tree.find(n => n.name === '系统管理')
    menuTree.value = systemDir?.children || tree.filter(n => n.name !== '系统管理')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '加载菜单失败'
  } finally {
    loading.value = false
  }
}

/** 将菜单 path 转换为 admin 内部路由 */
function toAdminRoute(path: string): string {
  // 新格式：/system/xxx → system/xxx
  if (path.startsWith('/system/')) return path.slice(1)
  // 旧格式：/app/admin/xxx → system/xxx
  return path.replace(/^\/app\/admin\//, 'system/')
}

function navigateTo(node: MenuItem): void {
  activeId.value = node.id
  const routeType = node.routeType || 'micro-app'

  if (routeType === 'schema' && node.schemaId) {
    router.push(`/schema/${node.schemaId}`)
    return
  }

  if (routeType === 'link' && node.url) {
    window.open(node.url, node.target === '_self' ? '_self' : '_blank')
    return
  }

  // micro-app
  if (node.path) {
    if (node.microAppId === 'admin') {
      // admin 自己的菜单 → 内部路由
      router.push(`/${toAdminRoute(node.path)}`)
    } else {
      // 其他子应用 → 导航到 shell，由 qiankun 加载
      const shellBase = APP_CONFIGS.shell.basePath
      window.location.href = `${shellBase}${node.path.startsWith('/') ? node.path.slice(1) : node.path}`
    }
  }
}

onMounted(loadMenus)
</script>

<template>
  <div :class="$style.layout">
    <aside :class="$style.sidebar">
      <div :class="$style.sidebarHeader">
        <div :class="$style.logoIcon">S</div>
        <span :class="$style.logoText">系统管理</span>
      </div>

      <nav :class="$style.menuNav">
        <div v-if="loading" :class="$style.stateMsg">加载中...</div>
        <div v-else-if="error" :class="$style.stateMsg">{{ error }}</div>
        <div v-else-if="menuTree.length === 0" :class="$style.stateMsg">暂无菜单</div>
        <template v-else>
          <div
            v-for="node in menuTree"
            :key="node.id"
            :class="[$style.menuItem, { [$style.menuItemActive]: activeId === node.id }]"
            @click="navigateTo(node)"
          >
            <AppIcon :name="resolveIconName(node.icon)" :size="18" />
            <span :class="$style.menuLabel">{{ node.name }}</span>
          </div>
        </template>
      </nav>
    </aside>

    <main :class="$style.content">
      <router-view />
    </main>
  </div>
</template>

<style module>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-color-page);
  font-family: var(--font-family-base);
}

/* ---- 侧边栏（使用设计令牌） ---- */

.sidebar {
  width: 220px;
  height: 100vh;
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid var(--sidebar-border-color);
  overflow: hidden;
}

.sidebarHeader {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid var(--sidebar-border-color);
  flex-shrink: 0;
}

.logoIcon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--color-primary);
  color: var(--text-color-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.logoText {
  font-size: var(--font-size-16);
  font-weight: var(--font-weight-semibold);
  color: var(--text-color-inverse);
  white-space: nowrap;
}

.menuNav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.stateMsg {
  padding: 16px;
  color: var(--sidebar-text-color);
  font-size: var(--font-size-13);
  text-align: center;
  opacity: 0.5;
}

.menuItem {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 16px;
  margin: 2px 8px;
  border-radius: 6px;
  color: var(--sidebar-text-color);
  cursor: pointer;
  transition: var(--transition-color);
  user-select: none;
  overflow: hidden;
  position: relative;
}

.menuItem:hover {
  color: var(--sidebar-text-color-active);
  background: var(--sidebar-bg-hover);
}

.menuItemActive {
  color: var(--sidebar-text-color-active);
  background: var(--sidebar-bg-active);
}

.menuLabel {
  font-size: var(--font-size-14);
  white-space: nowrap;
  flex: 1;
}

/* ---- 内容区 ---- */

.content {
  flex: 1;
  overflow: auto;
  background: var(--bg-color-page);
}
</style>
