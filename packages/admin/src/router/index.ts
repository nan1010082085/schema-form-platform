import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes: [
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
          path: 'logs',
          name: 'logs',
          component: () => import('@/views/LogManageView.vue'),
          meta: { title: '操作日志' },
        },
      ],
    },
  ],
})

export default router
