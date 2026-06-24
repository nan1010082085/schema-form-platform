/**
 * Shell router
 *
 * Route structure:
 * - /              → DynamicLayout → HomeView (sidebar shell)
 * - /app/:app/*    → DynamicLayout → ClassicSidebarLayout + MicroAppContainer
 * - /standalone/:app/* → DynamicLayout → StandaloneLayout + MicroAppContainer
 * - /login         → LoginView (public)
 * - /sso/callback  → SSOCallbackView (public)
 *
 * Layout selection is driven by micro-app config (with-menu / without-menu).
 */
import { createRouter, createWebHistory } from 'vue-router'
import { APP_CONFIGS } from '@schema-form/platform-shared/qiankun/config'
import { useAuthStore } from '@/stores/auth'

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

    // ---- SSO callback ----
    {
      path: '/sso/callback',
      name: 'sso-callback',
      component: () => import('@/views/SSOCallbackView.vue'),
      meta: { public: true },
    },

    // ---- Dynamic layout (handles all app routes) ----
    {
      path: '/',
      component: () => import('@/layouts/DynamicLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
        },
        {
          path: 'app/:app/:pathMatch(.*)*',
          name: 'app-embed',
          component: () => import('@/views/HomeView.vue'),
        },
        {
          path: 'standalone/:app/:pathMatch(.*)*',
          name: 'standalone-app',
          component: () => import('@/views/HomeView.vue'),
        },
      ],
    },

    // ---- Catch-all ----
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// Global navigation guard
// 只检查 token 存在性，不调用 fetchUser（避免 401 硬跳转导致导航卡死）
// 用户信息恢复由 main.ts 的 restoreSession() 统一处理
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  const isPublic = to.meta?.public === true || PUBLIC_ROUTES.has(to.path)

  if (!authStore.token) {
    if (isPublic) { next() } else { next({ path: '/login', query: { redirect: to.fullPath } }) }
    return
  }

  // 已登录用户访问登录页 → 重定向首页
  if (to.path === '/login') { next({ path: '/' }); return }

  next()
})

export default router
