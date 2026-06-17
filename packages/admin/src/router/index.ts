import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { useQiankun } from '@schema-form/shared-qiankun'
import { useAuthStore } from '../stores/auth'

const isQiankun = () => !!window.__POWERED_BY_QIANKUN__
const APP_BASE = import.meta.env.BASE_URL

const router = createRouter({
  history: isQiankun() ? createMemoryHistory() : createWebHistory(APP_BASE),
  routes: [
    // ---- 共享登录页（独立模式） ----
    {
      path: '/login',
      name: 'login',
      component: () => import('@schema-form/shared-components/auth/LoginView.vue'),
      props: {
        title: '系统管理',
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
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          redirect: { name: 'micro-apps' },
        },
        {
          path: 'micro-apps',
          name: 'micro-apps',
          component: () => import('@/views/MicroAppManageView.vue'),
          meta: { title: '微应用管理', permission: 'microapp:view' },
        },
        {
          path: 'menus',
          name: 'menus',
          component: () => import('@/views/MenuManageView.vue'),
          meta: { title: '菜单管理', permission: 'menu:view' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UserManageView.vue'),
          meta: { title: '用户管理', permission: 'user:view' },
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/views/RoleManageView.vue'),
          meta: { title: '角色管理', permission: 'role:view' },
        },
        {
          path: 'depts',
          name: 'depts',
          component: () => import('@/views/DeptManageView.vue'),
          meta: { title: '部门管理', permission: 'dept:view' },
        },
        {
          path: 'posts',
          name: 'posts',
          component: () => import('@/views/PostManageView.vue'),
          meta: { title: '岗位管理', permission: 'post:view' },
        },
        {
          path: 'dict',
          name: 'dict',
          component: () => import('@/views/DictManageView.vue'),
          meta: { title: '字典管理', permission: 'dict:view' },
        },
        {
          path: 'config',
          name: 'config',
          component: () => import('@/views/ConfigManageView.vue'),
          meta: { title: '参数设置', permission: 'config:view' },
        },
        {
          path: 'model-configs',
          name: 'model-configs',
          component: () => import('@/views/ModelConfigView.vue'),
          meta: { title: '模型配置' },
        },
        {
          path: 'logs',
          name: 'logs',
          component: () => import('@/views/LogManageView.vue'),
          meta: { title: '操作日志', permission: 'audit:view' },
        },
      ],
    },
  ],
})

// 路由守卫：独立访问时检查登录状态 + 权限检查
router.beforeEach(async (to) => {
  // callback 和 login 页面不需要检查
  if (to.name === 'auth-callback' || to.name === 'login') {
    return true
  }

  // 微前端模式下跳过登录检查（宿主已处理鉴权）
  if (!isQiankun()) {
    const { getGlobalState } = useQiankun()
    const state = getGlobalState()
    const token = (state.token as string) || localStorage.getItem('sfp_access_token')
    if (!token) {
      // 跳转到统一登录页，带上当前路径作为 redirect 参数
      return {
        name: 'login',
        query: { redirect: window.location.pathname },
      }
    }
  }

  // 权限检查：加载用户权限后验证路由权限
  const requiredPermission = to.meta.permission as string | undefined
  if (requiredPermission) {
    const authStore = useAuthStore()
    await authStore.loadUser()
    if (!authStore.hasPermission(requiredPermission)) {
      return { name: 'dashboard' }
    }
  }
})

export default router
