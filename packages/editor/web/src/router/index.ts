import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useEditorStore } from '@/stores/editor'

// micro-app 模式下使用 memory history，避免子应用路由篡改宿主 URL
const isMicroApp = () => !!window.__MICRO_APP_ENVIRONMENT__

const router = createRouter({
  history: isMicroApp() ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ---- Redirects ----
    { path: '/', redirect: '/instances' },
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
          name: 'widget-docs',
          component: () => import('@/views/WidgetDocsView.vue'),
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

export default router
