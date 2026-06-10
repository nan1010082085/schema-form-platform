/**
 * Tenant Context — AsyncLocalStorage-based tenantId propagation.
 *
 * The Koa middleware sets the tenantId into AsyncLocalStorage,
 * and the Mongoose tenantPlugin reads it in pre-hooks to enforce
 * data isolation across all tenant-scoped collections.
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { Middleware } from 'koa'

// ── AsyncLocalStorage for tenant context ──

interface TenantContext {
  tenantId: string
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>()

/** Get the current tenantId from async context. Returns undefined if not set. */
export function getCurrentTenantId(): string | undefined {
  return tenantStorage.getStore()?.tenantId
}

// ── Koa middleware ──

const DEFAULT_TENANT_ID = '000000'

/**
 * Koa middleware that extracts tenantId from the request and stores it
 * in AsyncLocalStorage for downstream Mongoose hooks to consume.
 *
 * Tenant resolution priority:
 * 1. `X-Tenant-Id` header
 * 2. `ctx.state.user.tenantId` (set by auth middleware)
 * 3. Falls back to DEFAULT_TENANT_ID ('000000')
 */
export function tenantContextMiddleware(): Middleware {
  return async (ctx, next) => {
    const headerTenantId = ctx.get('X-Tenant-Id')
    const userTenantId = (ctx.state.user as Record<string, unknown> | undefined)?.tenantId as string | undefined
    const tenantId = headerTenantId || userTenantId || DEFAULT_TENANT_ID

    ctx.state.tenantId = tenantId

    await tenantStorage.run({ tenantId }, async () => {
      await next()
    })
  }
}
