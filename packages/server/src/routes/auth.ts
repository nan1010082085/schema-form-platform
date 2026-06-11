import Router from '@koa/router'
import jwt from 'jsonwebtoken'
import { UserModel } from '../models/User.js'
import { RoleModel } from '../models/Role.js'
import { TenantModel } from '../models/Tenant.js'
import { authMiddleware } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { loginSchema, refreshSchema } from '../schemas/authSchemas.js'
import { JWT_SECRET } from '../config/jwt.js'
import type { JwtPayload } from '../middleware/auth.js'

const router = new Router({ prefix: '/api/auth' })

/** Token expiry constants */
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

/**
 * POST /api/auth/login
 *
 * Tenant resolution priority:
 * 1. `tenantCode` in request body (resolved to tenantId)
 * 2. `X-Tenant-Id` header
 * 3. Falls back to DEFAULT_TENANT_ID ('000000')
 */
router.post('/login', validate(loginSchema), async (ctx) => {
  const { username, password, tenantCode } = ctx.request.body as {
    username: string
    password: string
    tenantCode?: string
  }

  // Resolve tenantId
  const DEFAULT_TENANT_ID = '000000'
  let tenantId: string

  if (tenantCode) {
    // Resolve tenantCode to tenantId
    const tenant = await TenantModel.findOne({ code: tenantCode, status: 'active' })
    if (!tenant) {
      ctx.status = 401
      ctx.body = { success: false, error: { message: 'Invalid tenant.' } }
      return
    }
    tenantId = tenant._id
  } else {
    tenantId = ctx.get('X-Tenant-Id') || DEFAULT_TENANT_ID
  }

  // Query user scoped to tenant
  const user = await UserModel.findOne({ username, tenantId })
  if (!user) {
    ctx.status = 401
    ctx.body = { success: false, error: { message: 'Invalid username or password.' } }
    return
  }

  const valid = await user.comparePassword(password)
  if (!valid) {
    ctx.status = 401
    ctx.body = { success: false, error: { message: 'Invalid username or password.' } }
    return
  }

  const basePayload: Omit<JwtPayload, 'tokenType'> = {
    id: user._id,
    username: user.username,
    roles: user.roles,
    tenantId: user.tenantId,
    deptId: user.deptId,
  }

  const accessToken = jwt.sign(
    { ...basePayload, tokenType: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  )

  const refreshToken = jwt.sign(
    { ...basePayload, tokenType: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  )

  ctx.body = {
    success: true,
    data: {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutes in seconds
      user: user.toJSON(),
    },
  }
})

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for a new access token.
 */
router.post('/refresh', validate(refreshSchema), async (ctx) => {
  const { refreshToken } = ctx.request.body as { refreshToken: string }

  let payload: JwtPayload
  try {
    payload = jwt.verify(refreshToken, JWT_SECRET) as JwtPayload
  } catch {
    ctx.status = 401
    ctx.body = { success: false, error: { message: 'Invalid or expired refresh token.' } }
    return
  }

  if (payload.tokenType !== 'refresh') {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Token is not a refresh token.' } }
    return
  }

  // Verify user still exists
  const user = await UserModel.findById(payload.id)
  if (!user) {
    ctx.status = 401
    ctx.body = { success: false, error: { message: 'User no longer exists.' } }
    return
  }

  const newAccessToken = jwt.sign(
    {
      id: user._id,
      username: user.username,
      roles: user.roles,
      tenantId: user.tenantId,
      deptId: user.deptId,
      tokenType: 'access' as const,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  )

  ctx.body = {
    success: true,
    data: {
      accessToken: newAccessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    },
  }
})

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (ctx) => {
  ctx.body = { success: true, data: null }
})

/**
 * GET /api/auth/me
 *
 * Returns user info with resolved permissions from roles.
 */
router.get('/me', authMiddleware({ required: true }), async (ctx) => {
  const payload = ctx.state.user as JwtPayload

  const user = await UserModel.findById(payload.id)
  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found.' } }
    return
  }

  // Resolve permissions from user's roles
  const roles = await RoleModel.find({ _id: { $in: user.roles } })
  const permissions = [...new Set(roles.flatMap((r) => r.permissions))]

  ctx.body = {
    success: true,
    data: {
      ...user.toJSON(),
      permissions,
    },
  }
})

export default router
