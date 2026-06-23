/**
 * Admin 路由
 *
 * HomeView 是布局壳（侧边栏 + 内容区），
 * 子路由在 HomeView 的 <router-view /> 中渲染。
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
          // ── 系统管理 ──
          {
            path: 'system/menus',
            name: 'system-menus',
            component: () => import('@/views/system/MenuManagement.vue'),
          },
          {
            path: 'system/users',
            name: 'system-users',
            component: () => import('@/views/system/UserManagement.vue'),
          },
          {
            path: 'system/roles',
            name: 'system-roles',
            component: () => import('@/views/system/RoleManagement.vue'),
          },
          {
            path: 'system/depts',
            name: 'system-depts',
            component: () => import('@/views/system/DeptManagement.vue'),
          },
          {
            path: 'system/posts',
            name: 'system-posts',
            component: () => import('@/views/system/PostManagement.vue'),
          },
          {
            path: 'system/dicts',
            name: 'system-dicts',
            component: () => import('@/views/system/DictManagement.vue'),
          },
          {
            path: 'system/configs',
            name: 'system-configs',
            component: () => import('@/views/system/ConfigManagement.vue'),
          },
          {
            path: 'system/audit-logs',
            name: 'system-audit-logs',
            component: () => import('@/views/system/AuditLogView.vue'),
          },
          {
            path: 'system/login-logs',
            name: 'system-login-logs',
            component: () => import('@/views/system/LoginLogView.vue'),
          },
          {
            path: 'system/online-users',
            name: 'system-online-users',
            component: () => import('@/views/system/OnlineUsersView.vue'),
          },
          {
            path: 'system/tenants',
            name: 'system-tenants',
            component: () => import('@/views/system/TenantManagement.vue'),
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
