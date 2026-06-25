import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useEditorStore } from '@/stores/editor'

// qiankun 模式下使用 memory history，避免子应用路由篡改宿主 URL
const isQiankunSubApp = () => !!window.__POWERED_BY_QIANKUN__

/** 统一 token 解析 */
const TOKEN_KEY = 'sfp_access_token'
function resolveToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

const routes = [
  // ---- 共享登录页（独立模式） ----
  {
    path: '/login',
    name: 'login',
    component: () => import('@schema-form/platform-shared/components/auth/LoginView.vue'),
    props: {
      title: '表单设计器',
      subtitle: 'Schema Form Platform',
    },
    meta: { public: true },
  },

  // ---- SSO Callback ----
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/views/AuthCallbackView.vue'),
    meta: { public: true },
  },

  // ---- Redirects ----
  { path: '/', redirect: '/editor' },
  {
    path: '/renderer',
    redirect: (to: { query: { id?: string } }) => `/view?id=${to.query.id || ''}`,
  },

  // ---- Editor core pages (无布局壳) ----
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
    history: isQiankunSubApp() ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes,
  })

  // 路由守卫：独立访问时检查登录状态
  router.beforeEach((to) => {
    // 403/404/callback/login 页面不需要检查
    if (to.name === 'forbidden' || to.name === 'not-found' || to.name === 'auth-callback' || to.name === 'login') {
      return true
    }

    // 微前端模式下跳过检查（宿主已处理鉴权）
    if (!isQiankunSubApp() && !resolveToken()) {
      // 跳转到统一登录页，带上当前路径作为 redirect 参数
      return {
        name: 'login',
        query: { redirect: window.location.pathname },
      }
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
          confirmButtonText: '确定离开',
          cancelButtonText: '取消',
          type: 'warning',
        }).then(() => {
          allowEditorLeave = true
          router.push(to.fullPath)
        }).catch(() => {
          // 用户取消：恢复浏览器 URL 到当前路由（仅非微前端模式）
          if (!isQiankunSubApp()) {
            window.history.pushState(null, '', router.resolve(from.fullPath).href)
          }
        })
        return false
      }
    }
  })

  return router
}
