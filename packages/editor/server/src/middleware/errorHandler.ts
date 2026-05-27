import type { Middleware } from 'koa'

export const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next()
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500
    const message = err instanceof Error ? err.message : 'Internal Server Error'

    ctx.status = status
    ctx.body = {
      success: false,
      error: {
        message,
        status,
      },
    }

    if (status === 500) {
      console.error('[Error]', err)
    }

    ctx.app.emit('error', err, ctx)
  }
}
