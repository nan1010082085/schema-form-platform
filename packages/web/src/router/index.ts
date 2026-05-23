import { createRouter, createWebHistory } from 'vue-router'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'
import { useEditorStore } from '@/stores/editor'

const routerBase = qiankunWindow.__POWERED_BY_QIANKUN__
  ? '/child/schemaForm/'
  : import.meta.env.BASE_URL

const router = createRouter({
  history: createWebHistory(routerBase),
  routes: [
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

// 路由守卫：编辑器未保存时拦截离开
router.beforeEach((_to, from) => {
  if (from.name === 'editor') {
    const editorStore = useEditorStore()
    if (editorStore.isDirty) {
      const confirmed = window.confirm('当前编辑未保存，确定要离开吗？')
      if (!confirmed) return false
    }
  }
})

export default router
