import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useEditorStore } from '@/stores/editor'
import { resolveToken } from '@schema-form/micro-app/child'
import { SSOClient } from '@schema-form/shared-utils/sso'

// SSO 客户端配置
const SSO_CLIENT_ID = 'editor'

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
    component: () => import('@/views/AuthCallbackView.vue'),
    meta: { public: true },
  },

  // ---- Redirects ----
  { path: '/', redirect: '/instances' },
  {
    path: '/renderer',
    redirect: (to: { query: { id?: string } }) => `/view?id=${to.query.id || ''}`,
  },

  // ---- 带全局布局的管理页面 ----
  {
    path: '/',
    component: () => import('@/components/AppLayout.vue'),
    children: [
      {
        path: 'instances',
        name: 'instances',
        component: () => import('@/views/InstancesView.vue'),
      },
      {
        path: 'templates',
        name: 'widget-templates',
        component: () => import('@/views/WidgetTemplateView.vue'),
      },
    ],
  },

  // ---- 全屏页面（无布局壳）----
  {
    path: '/editor',
    name: 'editor',
    component: () => import('@/views/EditorView.vue'),
  },
  {
    path: '/preview',
    name: 'preview-render',
    component: () => import('@/views/PreviewRenderView.vue'),
  },
  {
    path: '/view',
    name: 'publish-view',
    component: () => import('@/views/PublishView.vue'),
  },

  // ---- 403 ----
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
  },

  // ---- 404 ----
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

export function createEditorRouter() {
  const router = createRouter({
    history: isMicroApp() ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes,
  })

  // 路由守卫：独立访问时检查登录状态
  router.beforeEach((to) => {
    // 403/404/callback 页面不需要检查
    if (to.name === 'forbidden' || to.name === 'not-found' || to.name === 'auth-callback') {
      return true
    }

    // 微前端模式下跳过检查（宿主已处理鉴权）
    if (!isMicroApp() && !resolveToken()) {
      getSSOClient().login(window.location.href)
      return false
    }
  })

  // 路由守卫：编辑器未保存时拦截离开
  let allowEditorLeave = false

  router.beforeEach((to, from) => {
    if (allowEditorLeave) {
      allowEditorLeave = false
      return true
    }

    if (from.name === 'editor') {
      const editorStore = useEditorStore()
      if (editorStore.isDirty) {
        // 弹框确认（异步），先阻止导航
        ElMessageBox.confirm('当前编辑未保存，确定要离开吗？', '提示', {
          type: 'warning',
          confirmButtonText: '确定离开',
          cancelButtonText: '取消',
          closeOnClickModal: false,
          closeOnPressEscape: false,
        }).then(() => {
          allowEditorLeave = true
          router.push(to.fullPath)
        }).catch(() => {
          // 用户取消：恢复浏览器 URL 到当前路由（仅非 micro-app 模式）
          if (!isMicroApp()) {
            window.history.pushState(null, '', router.resolve(from.fullPath).href)
          }
        })
        return false
      }
    }
  })

  return router
}
