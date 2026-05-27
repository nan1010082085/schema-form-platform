import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        { path: '', redirect: '/list' },
        {
          path: 'list',
          name: 'flow-list',
          component: () => import('@/views/FlowListView.vue'),
        },
        {
          path: 'tasks',
          name: 'task-inbox',
          component: () => import('@/views/TaskInboxView.vue'),
        },
        {
          path: 'instance/:id',
          name: 'flow-instance-detail',
          component: () => import('@/views/FlowInstanceDetailView.vue'),
          props: true,
        },
      ],
    },
    {
      path: '/designer',
      name: 'flow-designer',
      component: () => import('@/components/FlowDesigner.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

export default router
