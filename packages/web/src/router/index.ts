import { createRouter, createWebHistory } from 'vue-router'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

const routerBase = qiankunWindow.__POWERED_BY_QIANKUN__
  ? '/child/schemaForm/'
  : import.meta.env.BASE_URL

const router = createRouter({
  history: createWebHistory(routerBase),
  routes: [
    // ---- Redirects from old routes ----
    { path: '/', redirect: '/instances' },
    { path: '/schemas', redirect: '/instances' },
    { path: '/demo', redirect: '/docs' },
    {
      path: '/renderer',
      redirect: (to) => `/view?id=${to.query.id || ''}`,
    },

    // ---- Primary routes ----
    {
      path: '/instances',
      name: 'instances',
      component: () => import('@/views/InstancesView.vue'),
    },
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
    {
      path: '/docs',
      name: 'docs',
      component: () => import('@/views/DocsIndexView.vue'),
    },
    {
      path: '/docs/:componentId',
      name: 'docs-component',
      component: () => import('@/views/docs/ComponentDocPage.vue'),
      props: true,
    },
  ],
})

export default router
