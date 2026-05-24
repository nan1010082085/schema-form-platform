import { createRouter, createWebHistory } from 'vue-router'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'
import { ElMessageBox } from 'element-plus'
import { useEditorStore } from '@/stores/editor'
import { useAuthStore } from '@/stores/auth'

const isQiankun = qiankunWindow.__POWERED_BY_QIANKUN__

const routerBase = isQiankun
  ? '/child/schemaForm/'
  : import.meta.env.BASE_URL

const router = createRouter({
  history: createWebHistory(routerBase),
  routes: [
    // ---- 登录 ----
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },

    // ---- Redirects ----
    { path: '/', redirect: '/instances' },
    { path: '/schemas', redirect: '/instances' },
    { path: '/demo', redirect: '/docs' },
    {
      path: '/renderer',
      redirect: (to) => `/view?id=${to.query.id || ''}`,
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
          path: 'docs',
          name: 'docs',
          component: () => import('@/views/DocsIndexView.vue'),
        },
        {
          path: 'docs/:componentId',
          name: 'docs-component',
          component: () => import('@/views/docs/ComponentDocPage.vue'),
          props: true,
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

    // ---- 404 ----
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

// 路由守卫：认证检查（仅独立生产模式）
router.beforeEach((to) => {
  if (isQiankun) return true
  if (import.meta.env.DEV) return true

  const authStore = useAuthStore()
  if (!authStore.isLoggedIn && to.name !== 'login') {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

// 路由守卫：编辑器未保存时拦截离开
let pendingNavigation: (() => void) | null = null

router.beforeEach((to, from) => {
  // 如果是确认后的导航，直接放行
  if (pendingNavigation) {
    pendingNavigation()
    pendingNavigation = null
    return true
  }

  if (from.name === 'editor') {
    const editorStore = useEditorStore()
    if (editorStore.isDirty) {
      ElMessageBox.confirm('当前编辑未保存，确定要离开吗？', '提示', {
        type: 'warning',
        confirmButtonText: '确定离开',
        cancelButtonText: '取消',
      }).then(() => {
        // 用户确认，执行导航
        pendingNavigation = () => router.push(to.fullPath)
        router.push(to.fullPath)
      }).catch(() => {
        // 用户取消，不做任何事
      })
      return false
    }
  }
})

export default router
