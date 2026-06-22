/**
 * Shell router
 *
 * 两种微应用容器模式：
 * 1. 带菜单 — /app/{appName}/* — 嵌入在 DynamicLayout 内，需注册
 * 2. open 页签 — /standalone/{appName}/* — StandaloneLayout，完全无壳
 *    支持 entry 模式：/standalone?entry=url — iframe 直接请求 entry
 */
import { createRouter, createWebHistory } from 'vue-router'
import { APP_CONFIGS } from '@schema-form/shared-qiankun/config'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'

const PUBLIC_ROUTES = new Set(['/login', '/sso/callback'])
const base = APP_CONFIGS.shell.basePath

const router = createRouter({
  history: createWebHistory(base),
  routes: [
    // ---- Login ----
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },

    // ---- SSO 回调 ----
    {
      path: '/sso/callback',
      name: 'sso-callback',
      component: () => import('@/views/SSOCallbackView.vue'),
      meta: { public: true },
    },

    // ---- 带菜单容器 ----
    {
      path: '/',
      component: () => import('@/layouts/DynamicLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/components/AppContainer.vue'),
          meta: { title: '首页' },
        },
        {
          path: 'app/:app/:pathMatch(.*)*',
          name: 'app-embed',
          component: () => import('@/components/AppContainer.vue'),
          meta: { withMenu: true },
        },
      ],
    },

    // ---- 独立页签容器 ----
    {
      path: '/standalone',
      component: () => import('@/layouts/StandaloneLayout.vue'),
      children: [
        {
          path: ':app/:pathMatch(.*)*',
          name: 'standalone-app',
          component: () => import('@/components/AppContainer.vue'),
        },
        {
          // entry 模式：/standalone?entry=url
          path: '',
          name: 'standalone-entry',
          component: () => import('@/components/StandaloneEntry.vue'),
        },
      ],
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

  if (!authStore.token) {
    if (isPublic) { next() } else { next({ path: '/login', query: { redirect: to.fullPath } }) }
    return
  }

  if (!authStore.user) {
    try { await fetchUser() } catch {
      if (isPublic) { next() } else { next({ path: '/login', query: { redirect: to.fullPath } }) }
      return
    }
  }

  if (to.path === '/login') { next({ path: '/' }); return }

  next()
})

export default router
