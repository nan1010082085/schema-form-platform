/**
 * useRouteGuard — 路由守卫逻辑
 *
 * 职责：
 * - 注册 beforeEach 全局前置守卫
 * - 无 token 时重定向到 /login
 * - 有 token 时获取用户信息 + 权限
 * - 检查路由 meta.permissions 权限要求
 *
 * 依赖：
 * - useAuthStore（token 状态）
 * - useAuth（fetchUser）
 * - usePermission（权限加载与检查）
 *
 * 设计原则：
 * - 纯逻辑 composable，不包含 UI
 * - 守卫只做认证 + 权限检查，不处理业务
 * - 白名单路由（/login）跳过守卫
 */
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'
import { usePermission } from '@/composables/usePermission'
import type { Router } from 'vue-router'

/** 不需要认证的路由白名单 */
const PUBLIC_ROUTES = new Set(['/login'])

/**
 * 判断路由是否为微前端子应用路由
 * 子应用路由（/editor, /flow, /ai）不需要前端权限检查
 * 因为它们是独立应用，由各自的入口控制访问
 */
function isMicroAppRoute(path: string): boolean {
  return path.startsWith('/editor') || path.startsWith('/flow') || path.startsWith('/ai')
}

export function useRouteGuard() {
  /**
   * 在 router 实例上注册全局前置守卫
   * 应在 main.ts 中 router 挂载后调用一次
   */
  function setupGuard(router: Router): void {
    router.beforeEach(async (to, _from, next) => {
      const authStore = useAuthStore()
      const { fetchUser } = useAuth()
      const { loadPermissions, hasPermission, clearPermissions } = usePermission()

      const isPublic = PUBLIC_ROUTES.has(to.path)

      // ── 无 token ──
      if (!authStore.token) {
        if (isPublic) {
          next()
        } else {
          next({ path: '/login', query: { redirect: to.fullPath } })
        }
        return
      }

      // ── 已有 token 但未加载用户信息 ──
      if (!authStore.user) {
        try {
          await fetchUser()
          await loadPermissions()
        } catch {
          // token 无效，fetchUser 内部已 reset store
          clearPermissions()
          if (isPublic) {
            next()
          } else {
            next({ path: '/login', query: { redirect: to.fullPath } })
          }
          return
        }
      }

      // ── 已登录访问登录页 → 重定向首页 ──
      if (to.path === '/login') {
        next({ path: '/' })
        return
      }

      // ── 微前端子应用路由，跳过前端权限检查 ──
      if (isMicroAppRoute(to.path)) {
        next()
        return
      }

      // ── 权限检查 ──
      const requiredPermissions = to.meta?.permissions as string[] | undefined
      if (requiredPermissions?.length) {
        const authorized = requiredPermissions.some((p) => hasPermission(p))
        if (!authorized) {
          // 无权限，重定向首页
          next({ path: '/' })
          return
        }
      }

      next()
    })
  }

  return { setupGuard }
}
