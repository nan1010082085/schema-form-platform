import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { useQiankun } from '@schema-form/shared-qiankun'
import { SSOClient } from '@schema-form/shared-utils/sso'

// SSO 客户端配置
const SSO_CLIENT_ID = 'admin'

function getSSOClient(): SSOClient {
  const origin = window.location.origin
  return new SSOClient({
    clientId: SSO_CLIENT_ID,
    redirectUri: `${origin}/admin/auth/callback`,
    ssoBaseUrl: origin,
  })
}

const isQiankun = () => !!window.__POWERED_BY_QIANKUN__

const router = createRouter({
  history: isQiankun() ? createMemoryHistory() : createWebHistory('/admin/'),
  routes: [
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
          meta: { title: '微应用管理' },
        },
        {
          path: 'menus',
          name: 'menus',
          component: () => import('@/views/MenuManageView.vue'),
          meta: { title: '菜单管理' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UserManageView.vue'),
          meta: { title: '用户管理' },
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/views/RoleManageView.vue'),
          meta: { title: '角色管理' },
        },
        {
          path: 'depts',
          name: 'depts',
          component: () => import('@/views/DeptManageView.vue'),
          meta: { title: '部门管理' },
        },
        {
          path: 'posts',
          name: 'posts',
          component: () => import('@/views/PostManageView.vue'),
          meta: { title: '岗位管理' },
        },
        {
          path: 'dict',
          name: 'dict',
          component: () => import('@/views/DictManageView.vue'),
          meta: { title: '字典管理' },
        },
        {
          path: 'config',
          name: 'config',
          component: () => import('@/views/ConfigManageView.vue'),
          meta: { title: '参数设置' },
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
          meta: { title: '操作日志' },
        },
      ],
    },
  ],
})

// 路由守卫：独立访问时检查登录状态
router.beforeEach((to) => {
  // callback 页面不需要检查
  if (to.name === 'auth-callback') {
    return true
  }

  // 微前端模式下跳过检查（宿主已处理鉴权）
  if (!isQiankun()) {
    const { getGlobalState } = useQiankun()
    const state = getGlobalState()
    const token = (state.token as string) || localStorage.getItem('sfp_access_token')
    if (!token) {
      getSSOClient().login(window.location.href)
      return false
    }
  }
})

export default router
