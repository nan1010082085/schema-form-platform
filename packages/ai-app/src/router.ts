import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { resolveToken } from '@schema-form/micro-app/child'
import { SSOClient } from '@schema-form/shared-utils/sso'

// SSO 客户端配置
const SSO_CLIENT_ID = 'ai'
const TOKEN_KEY = 'sfp_access_token'

function getSSOClient(): SSOClient {
  const origin = window.location.origin
  return new SSOClient({
    clientId: SSO_CLIENT_ID,
    redirectUri: `${origin}/auth/callback`,
    ssoBaseUrl: origin,
  })
}

// micro-app 模式下使用 memory history，避免子应用路由篡改宿主 URL
const isMicroApp = () => !!window.__MICRO_APP_ENVIRONMENT__

const routes = [
  // ---- SSO Callback ----
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('./views/AuthCallbackView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'chat',
    component: () => import('./views/AiChatView.vue'),
  },
  {
    path: '/sidebar',
    name: 'sidebar',
    component: () => import('./views/AiSidebarView.vue'),
  },
  {
    path: '/rag',
    name: 'rag',
    component: () => import('./views/RagKnowledgeBase.vue'),
  },
]

export function createAiRouter() {
  const router = createRouter({
    history: isMicroApp() ? createMemoryHistory() : createWebHistory('/ai/'),
    routes,
  })

  // 路由守卫：独立访问时检查登录状态
  router.beforeEach((to) => {
    // callback 页面不需要检查
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
