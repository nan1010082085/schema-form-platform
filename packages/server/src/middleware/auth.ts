import type { Middleware } from 'koa'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/jwt.js'

export interface JwtPayload {
  id: string
  username: string
  roles: string[]
}

export function authMiddleware(options?: { required?: boolean }): Middleware {
  const required = options?.required ?? true

  return async (ctx, next) => {
    // 本地开发跳过认证
    if (process.env.NODE_ENV !== 'production') {
      ctx.state.user = { id: 'dev', username: 'dev', roles: [] }
      await next()
      return
    }
    const authHeader = ctx.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (required) {
        ctx.status = 401
        ctx.body = { success: false, error: { message: 'Authentication required.' } }
        return
      }
      await next()
      return
    }

    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
      ctx.state.user = payload
    } catch {
      if (required) {
        ctx.status = 401
        ctx.body = { success: false, error: { message: 'Invalid or expired token.' } }
        return
      }
    }

    await next()
  }
}
