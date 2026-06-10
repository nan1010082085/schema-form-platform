import { createRouter, createWebHistory } from 'vue-router'

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

export default router
