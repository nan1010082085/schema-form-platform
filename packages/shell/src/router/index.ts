/**
 * Shell router
 *
 * 三种微应用容器模式：
 * 1. 带菜单容器（DynamicLayout 子路由）— 微应用嵌入在侧边栏布局内
 * 2. 独立页签容器（StandaloneLayout）— 完全无壳，新标签页打开
 * 3. 全屏容器（withoutMenu 顶级路由）— 保留兼容，与独立页签等效
 *
 * Layout hierarchy:
 * /login              → LoginView（独立登录页）
 * /                   → DynamicLayout（侧边栏 + Header）
 *   /home             → AppContainer（壳内首页）
 *   /editor-inline/*  → AppContainer（带菜单的 editor）
 *   /flow-inline/*    → AppContainer（带菜单的 flow）
 *   /ai-inline/*      → AppContainer（带菜单的 ai）
 *   /admin-inline/*   → AppContainer（带菜单的 admin）
 * /standalone/*       → StandaloneLayout（独立页签，完全无壳）
 *   /editor/*         → AppContainer
 *   /flow/*           → AppContainer
 *   /ai/*             → AppContainer
 *   /admin/*          → AppContainer
 */
import { createRouter, createWebHistory } from 'vue-router'
import { APP_CONFIGS } from '@schema-form/shared-qiankun/config'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'

/** Routes that do not require authentication */
const PUBLIC_ROUTES = new Set(['/login'])

const base = APP_CONFIGS.shell.basePath

const router = createRouter({
  history: createWebHistory(base),
  routes: [
    // ---- Login（独立，无壳） ----
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },

    // ---- 带菜单布局（侧边栏 + Header） ----
    {
      path: '/',
      component: () => import('@/layouts/DynamicLayout.vue'),
      children: [
        // 壳内首页
        {
          path: '',
          name: 'home',
          component: () => import('@/components/AppContainer.vue'),
          meta: { title: '首页' },
        },
        // 带菜单的微应用容器
        {
          path: 'editor-inline/:pathMatch(.*)*',
          name: 'editor-inline',
          component: () => import('@/components/AppContainer.vue'),
          meta: { microApp: 'editor', title: '表单编辑器' },
        },
        {
          path: 'flow-inline/:pathMatch(.*)*',
          name: 'flow-inline',
          component: () => import('@/components/AppContainer.vue'),
          meta: { microApp: 'flow', title: '流程设计器' },
        },
        {
          path: 'ai-inline/:pathMatch(.*)*',
          name: 'ai-inline',
          component: () => import('@/components/AppContainer.vue'),
          meta: { microApp: 'ai', title: 'AI 助手' },
        },
        {
          path: 'admin-inline/:pathMatch(.*)*',
          name: 'admin-inline',
          component: () => import('@/components/AppContainer.vue'),
          meta: { microApp: 'admin', title: '系统管理' },
        },
      ],
    },

    // ---- 独立页签容器（完全无壳） ----
    {
      path: '/standalone',
      component: () => import('@/layouts/StandaloneLayout.vue'),
      children: [
        {
          path: 'editor/:pathMatch(.*)*',
          name: 'standalone-editor',
          component: () => import('@/components/AppContainer.vue'),
          meta: { microApp: 'editor', withoutMenu: true },
        },
        {
          path: 'flow/:pathMatch(.*)*',
          name: 'standalone-flow',
          component: () => import('@/components/AppContainer.vue'),
          meta: { microApp: 'flow', withoutMenu: true },
        },
        {
          path: 'ai/:pathMatch(.*)*',
          name: 'standalone-ai',
          component: () => import('@/components/AppContainer.vue'),
          meta: { microApp: 'ai', withoutMenu: true },
        },
        {
          path: 'admin/:pathMatch(.*)*',
          name: 'standalone-admin',
          component: () => import('@/components/AppContainer.vue'),
          meta: { microApp: 'admin', withoutMenu: true },
        },
      ],
    },

    // ---- 全屏微应用（顶级路由，保留兼容） ----
    {
      path: '/editor/:pathMatch(.*)*',
      name: 'editor-embed',
      component: () => import('@/components/AppContainer.vue'),
      meta: { microApp: 'editor', withoutMenu: true },
    },
    {
      path: '/flow/:pathMatch(.*)*',
      name: 'flow-embed',
      component: () => import('@/components/AppContainer.vue'),
      meta: { microApp: 'flow', withoutMenu: true },
    },
    {
      path: '/ai/:pathMatch(.*)*',
      name: 'ai-embed',
      component: () => import('@/components/AppContainer.vue'),
      meta: { microApp: 'ai', withoutMenu: true },
    },
    {
      path: '/admin/:pathMatch(.*)*',
      name: 'admin-embed',
      component: () => import('@/components/AppContainer.vue'),
      meta: { microApp: 'admin', withoutMenu: true },
    },

    // ---- Legacy 重定向 ----
    {
      path: '/editor-legacy/:pathMatch(.*)*',
      redirect: (to) => `/schema-platform/editor/${to.params.pathMatch || ''}`,
    },
    {
      path: '/flow-legacy/:pathMatch(.*)*',
      redirect: (to) => `/schema-platform/flow/${to.params.pathMatch || ''}`,
    },
    {
      path: '/ai-legacy/:pathMatch(.*)*',
      redirect: (to) => `/schema-platform/ai/${to.params.pathMatch || ''}`,
    },
    {
      path: '/admin-legacy/:pathMatch(.*)*',
      redirect: (to) => `/schema-platform/admin/${to.params.pathMatch || ''}`,
    },

    // ---- 兜底 ----
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// Global navigation guard
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const { fetchUser } = useAuth()

  const isPublic = to.meta?.public === true || PUBLIC_ROUTES.has(to.path)

  // No token
  if (!authStore.token) {
    if (isPublic) {
      next()
    } else {
      next({ path: '/login', query: { redirect: to.fullPath } })
    }
    return
  }

  // Has token but user info not loaded yet (page refresh)
  if (!authStore.user) {
    try {
      await fetchUser()
    } catch {
      if (isPublic) {
        next()
      } else {
        next({ path: '/login', query: { redirect: to.fullPath } })
      }
      return
    }
  }

  // Logged in visiting login page -> redirect to home
  if (to.path === '/login') {
    next({ path: '/' })
    return
  }

  next()
})

export default router
