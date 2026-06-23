/**
 * Shell router
 *
 * 子应用路由匹配规则（qiankun activeRule 必须与实际 URL 一致）：
 * - 带菜单：/{appName}/* — 嵌入 DynamicLayout，qiankun 自动挂载
 * - 独立页签：/standalone/{appName}/*
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
        // 子应用路由：/{appName}/*
        // qiankun activeRule 匹配此路径后自动挂载对应子应用到 #micro-container
        {
          path: ':app/:pathMatch(.*)*',
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
