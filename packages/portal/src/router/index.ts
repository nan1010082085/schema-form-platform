import { createRouter, createWebHistory } from 'vue-router'
import { useRouteGuard } from '@/composables/useRouteGuard'

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
          meta: { permissions: [] },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UserManageView.vue'),
          meta: { permissions: ['user:view'] },
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/views/RoleManageView.vue'),
          meta: { permissions: ['role:view'] },
        },
        {
          path: 'depts',
          name: 'depts',
          component: () => import('@/views/DeptManageView.vue'),
          meta: { permissions: ['dept:view'] },
        },
        {
          path: 'menus',
          name: 'menus',
          component: () => import('@/views/MenuManageView.vue'),
          meta: { permissions: ['menu:view'] },
        },
        {
          path: 'posts',
          name: 'posts',
          component: () => import('@/views/PostManageView.vue'),
          meta: { permissions: ['post:view'] },
        },
        {
          path: 'dict',
          name: 'dict',
          component: () => import('@/views/DictManageView.vue'),
          meta: { permissions: ['dict:view'] },
        },
        {
          path: 'config',
          name: 'config',
          component: () => import('@/views/ConfigManageView.vue'),
          meta: { permissions: ['config:view'] },
        },
        {
          path: 'logs',
          name: 'logs',
          component: () => import('@/views/LogManageView.vue'),
          meta: { permissions: ['audit:view'] },
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
    {
      path: '/ai',
      name: 'ai-embed',
      component: () => import('@/views/AiView.vue'),
    },
    // 兜底重定向
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// 注册全局路由守卫
const { setupGuard } = useRouteGuard()
setupGuard(router)

export default router
