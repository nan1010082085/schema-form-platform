/**
 * Admin 路由
 *
 * HomeView 是布局壳（侧边栏 + 内容区），
 * SchemaPage 是嵌套路由，在 HomeView 的 <router-view /> 中渲染。
 */
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'

const isQiankunSubApp = () => !!window.__POWERED_BY_QIANKUN__

export function createAdminRouter() {
  return createRouter({
    history: isQiankunSubApp() ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes: [
      {
        path: '/',
        component: () => import('@/views/HomeView.vue'),
        children: [
          {
            path: '',
            name: 'home',
            component: () => import('@/views/WelcomeView.vue'),
          },
          {
            path: 'schema/:schemaId',
            name: 'schema-page',
            component: () => import('@/views/SchemaPage.vue'),
          },
        ],
      },
      {
        path: '/:pathMatch(.*)*',
        redirect: '/',
      },
    ],
  })
}
