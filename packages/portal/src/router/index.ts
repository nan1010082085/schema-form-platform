import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'portal',
      component: () => import('@/views/PortalView.vue'),
    },
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
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UserManageView.vue'),
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('@/views/RoleManageView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
