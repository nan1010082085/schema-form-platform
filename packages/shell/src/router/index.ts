/**
 * Shell router
 *
 * Layout modes:
 * - /login: standalone (no sidebar)
 * - /: with-menu layout (sidebar + breadcrumb + content)
 * - /editor, /flow, /ai: without-menu layout (full-screen micro-app)
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'

/** Routes that do not require authentication */
const PUBLIC_ROUTES = new Set(['/login'])

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Login -- standalone layout
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    // With-menu layout (sidebar + breadcrumb)
    {
      path: '/',
      component: () => import('@/views/ShellView.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/components/AppContainer.vue'),
          meta: { title: 'Home' },
        },
        // Admin pages rendered inside shell with sidebar
        {
          path: 'users',
          name: 'users',
          component: () => import('@/components/AppContainer.vue'),
          meta: { title: 'User Management', permissions: ['user:view'] },
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/components/AppContainer.vue'),
          meta: { title: 'Role Management', permissions: ['role:view'] },
        },
        {
          path: 'menus',
          name: 'menus',
          component: () => import('@/components/AppContainer.vue'),
          meta: { title: 'Menu Management', permissions: ['menu:view'] },
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
