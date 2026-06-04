import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 登录页 — 独立布局，不使用 AppLayout
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    // 公开页面 — 使用 AppLayout 作为父布局
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
          path: 'editor',
          name: 'editor-embed',
          component: () => import('@/views/EditorView.vue'),
        },
        {
          path: 'flow',
          name: 'flow-embed',
          component: () => import('@/views/FlowView.vue'),
        },
        {
          path: 'ai',
          name: 'ai-embed',
          component: () => import('@/views/AiView.vue'),
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UserManageView.vue'),
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/views/RoleManageView.vue'),
        },
      ],
    },
    // 兜底重定向
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
