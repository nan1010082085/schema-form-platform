import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'

// micro-app 模式下使用 memory history，避免子应用路由篡改宿主 URL
const isMicroApp = () => !!window.__MICRO_APP_ENVIRONMENT__

const routes = [
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
        path: 'instances',
        name: 'flow-instances',
        component: () => import('@/views/FlowInstanceListView.vue'),
        meta: { title: '流程实例' },
      },
      {
        path: 'instance/:id',
        name: 'flow-instance-detail',
        component: () => import('@/views/FlowInstanceDetailView.vue'),
        props: true,
      },
      {
        path: 'monitor',
        name: 'flow-monitor',
        component: () => import('@/components/FlowMonitorDashboard.vue'),
        meta: { title: '流程监控' },
      },
      {
        path: 'stats',
        name: 'flow-stats',
        component: () => import('@/views/FlowStatsView.vue'),
        meta: { title: '流程统计' },
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
]

export function createFlowRouter() {
  return createRouter({
    history: isMicroApp() ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes,
  })
}
