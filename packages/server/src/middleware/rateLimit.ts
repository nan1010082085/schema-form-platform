import type { Context, Middleware } from 'koa'
import ratelimit from 'koa-ratelimit'

export function createRateLimit(opts?: { max?: number; windowMs?: number }): Middleware {
  const rl = ratelimit({
    driver: 'memory',
    db: new Map(),
    duration: opts?.windowMs ?? 15 * 60 * 1000,
    max: opts?.max ?? 100,
    id: (ctx: Context) => ctx.ip,
    headers: {
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset',
      total: 'X-RateLimit-Limit',
    },
    throw: true,
  })

  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      await rl(ctx, next)
    } catch {
      ctx.status = 429
      ctx.body = {
        success: false,
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT',
        },
      }
    }
  }
}
