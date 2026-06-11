import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { resolveToken } from '@schema-form/micro-app/child'
import { SSOClient } from '@schema-form/shared-utils/sso'

// SSO 客户端配置
const SSO_CLIENT_ID = 'workflow'

function getSSOClient(): SSOClient {
  const origin = window.location.origin
  return new SSOClient({
    clientId: SSO_CLIENT_ID,
    redirectUri: `${origin}/auth/callback`,
    ssoBaseUrl: origin,
  })
}

// micro-app 模式下使用 memory history
const isMicroApp = () => !!window.__MICRO_APP_ENVIRONMENT__

const routes = [
  // SSO Callback
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('../views/AuthCallbackView.vue'),
    meta: { public: true },
  },

  // 主布局
  {
    path: '/',
    component: () => import('../components/AppLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/workflows',
      },
      {
        path: 'workflows',
        name: 'workflows',
        component: () => import('../views/WorkflowListView.vue'),
      },
      {
        path: 'workflow/create',
        name: 'workflow-create',
        component: () => import('../views/WorkflowCanvasView.vue'),
      },
      {
        path: 'workflow/:id',
        name: 'workflow-edit',
        component: () => import('../views/WorkflowCanvasView.vue'),
      },
      {
        path: 'workflow/:id/preview',
        name: 'workflow-preview',
        component: () => import('../views/WorkflowPreviewView.vue'),
      },
      {
        path: 'executions',
        name: 'executions',
        component: () => import('../views/WorkflowExecutionView.vue'),
      },
      {
        path: 'templates',
        name: 'templates',
        component: () => import('../views/WorkflowTemplateView.vue'),
      },
    ],
  },

  // 404
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/workflows',
  },
]

export function createWorkflowRouter() {
  const router = createRouter({
    history: isMicroApp() ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes,
  })

  // 路由守卫：独立访问时检查登录状态
  router.beforeEach((to) => {
    if (to.name === 'auth-callback') {
      return true
    }

    // 微前端模式下跳过检查（宿主已处理鉴权）
    if (!isMicroApp() && !resolveToken()) {
      getSSOClient().login(window.location.href)
      return false
    }
  })

  return router
}
