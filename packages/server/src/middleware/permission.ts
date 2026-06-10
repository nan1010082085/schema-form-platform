import type { Middleware } from 'koa'
import { RoleModel } from '../models/Role.js'
import type { JwtPayload } from './auth.js'

/**
 * 权限检查中间件
 * @param requiredPermissions - 需要的权限编码数组（任一即可）
 */
export function requirePermission(...requiredPermissions: string[]): Middleware {
  return async (ctx, next) => {
    // 通过环境变量控制是否跳过权限检查
    if (process.env.SKIP_PERMISSION_CHECK === 'true') {
      await next()
      return
    }

    const user = ctx.state.user as JwtPayload | undefined
    if (!user) {
      ctx.status = 401
      ctx.body = { success: false, error: { message: 'Authentication required.' } }
      return
    }

    // 获取用户所有角色的权限
    const roles = await RoleModel.find({ _id: { $in: user.roles } })
    const userPermissions = new Set(roles.flatMap(r => r.permissions))

    // 检查是否有任一所需权限
    const hasPermission = requiredPermissions.some(p => userPermissions.has(p))

    if (!hasPermission) {
      ctx.status = 403
      ctx.body = {
        success: false,
        error: {
          message: 'Permission denied.',
          required: requiredPermissions,
          current: Array.from(userPermissions),
        },
      }
      return
    }

    await next()
  }
}

/**
 * 角色检查中间件
 * @param requiredRoles - 需要的角色名称数组（任一即可）
 */
export function requireRole(...requiredRoles: string[]): Middleware {
  return async (ctx, next) => {
    // 通过环境变量控制是否跳过角色检查
    if (process.env.SKIP_PERMISSION_CHECK === 'true') {
      await next()
      return
    }

    const user = ctx.state.user as JwtPayload | undefined
    if (!user) {
      ctx.status = 401
      ctx.body = { success: false, error: { message: 'Authentication required.' } }
      return
    }

    // 获取用户所有角色名称
    const roles = await RoleModel.find({ _id: { $in: user.roles } })
    const roleNames = roles.map(r => r.name)

    // 检查是否有任一所需角色
    const hasRole = requiredRoles.some(r => roleNames.includes(r))

    if (!hasRole) {
      ctx.status = 403
      ctx.body = {
        success: false,
        error: {
          message: 'Role denied.',
          required: requiredRoles,
          current: roleNames,
        },
      }
      return
    }

    await next()
  }
}
