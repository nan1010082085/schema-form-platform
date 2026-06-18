/**
 * Shell router
 *
 * Layout modes:
 * - /login: standalone (no sidebar)
 * - /: with-menu layout (sidebar + breadcrumb + content)
 * - /editor, /flow, /ai: without-menu layout (full-screen micro-app)
 *
 * Qiankun handles micro-app mounting via route matching.
 * Dynamic third-party apps are registered via useMicroAppRegistry.
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
    // Login -- standalone layout
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    // 主布局 - 动态布局（根据用户偏好选择侧边栏或顶部导航）
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
      ],
    },
    // Without-menu layout (full-screen micro-app, no sidebar)
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
    // Admin system management - full-screen micro-app
    {
      path: '/admin/:pathMatch(.*)*',
      name: 'admin-embed',
      component: () => import('@/components/AppContainer.vue'),
      meta: { microApp: 'admin', withoutMenu: true },
    },
    // Legacy paths without schema-platform prefix (redirect to correct path)
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
    // Catch-all redirect
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
      // Token invalid, fetchUser already reset store internally
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
