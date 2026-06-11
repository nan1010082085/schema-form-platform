import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'

/** Routes that do not require authentication */
const PUBLIC_ROUTES = new Set(['/login'])

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 登录页 — 独立布局
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    // 首页 — 使用 AppLayout
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'portal',
          component: () => import('@/views/PortalView.vue'),
        },
        {
          path: 'admin/:pathMatch(.*)*',
          name: 'admin-embed',
          component: () => import('@/views/AdminView.vue'),
        },
      ],
    },
    // 子应用 — 独立布局，无导航栏
    {
      path: '/editor',
      name: 'editor-embed',
      component: () => import('@/views/EditorView.vue'),
    },
    {
      path: '/flow',
      name: 'flow-embed',
      component: () => import('@/views/FlowView.vue'),
    },
    // 兜底重定向
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
