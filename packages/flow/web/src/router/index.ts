import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { APP_CONFIGS } from '@schema-form/shared-qiankun/config'
import { SSOClient } from '@schema-form/shared-utils/sso'

// SSO 客户端配置
const SSO_CLIENT_ID = 'flow'
const APP_BASE = APP_CONFIGS.flow.basePath

function getSSOClient(): SSOClient {
  const origin = window.location.origin
  return new SSOClient({
    clientId: SSO_CLIENT_ID,
    redirectUri: `${origin}${APP_BASE}auth/callback`,
    ssoBaseUrl: origin,
  })
}

// qiankun 模式下使用 memory history，避免子应用路由篡改宿主 URL
const isQiankunChild = () => !!window.__POWERED_BY_QIANKUN__

const routes = [
  // ---- SSO Callback ----
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/views/AuthCallbackView.vue'),
    meta: { public: true },
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
        path: 'tasks',
        name: 'flow-tasks',
        component: () => import('@/views/TaskInboxView.vue'),
        meta: { title: '我的任务' },
      },
      {
        path: 'templates',
        name: 'flow-templates',
        component: () => import('@/views/FlowTemplateView.vue'),
        meta: { title: '流程模板' },
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
  const router = createRouter({
    history: isQiankunChild() ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes,
  })

  // 路由守卫：独立访问时检查登录状态
  router.beforeEach((to) => {
    // callback 页面不需要检查
    if (to.name === 'auth-callback') {
      return true
    }

    // 微前端模式下跳过检查（宿主已处理鉴权）
    if (!isQiankunChild() && !localStorage.getItem('sfp_access_token')) {
      getSSOClient().login(window.location.href)
      return false
    }
  })

  return router
}
