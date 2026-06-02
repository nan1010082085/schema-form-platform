import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'

// micro-app 模式下使用 memory history，避免子应用路由篡改宿主 URL
const isMicroApp = () => !!window.__MICRO_APP_ENVIRONMENT__

const routes = [
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
]

export function createAiRouter() {
  return createRouter({
    history: isMicroApp() ? createMemoryHistory() : createWebHistory('/ai/'),
    routes,
  })
}
