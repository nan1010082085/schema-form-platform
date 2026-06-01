import Router from '@koa/router'
import jwt from 'jsonwebtoken'
import { UserModel } from '../models/User.js'
import { authMiddleware } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { loginSchema } from '../schemas/authSchemas.js'
import { JWT_SECRET } from '../config/jwt.js'
import type { JwtPayload } from '../middleware/auth.js'

const router = new Router({ prefix: '/api/auth' })

/**
 * POST /api/auth/login
 */
router.post('/login', validate(loginSchema), async (ctx) => {
  const { username, password } = ctx.request.body as { username: string; password: string }

  const user = await UserModel.findOne({ username })
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

  const payload: JwtPayload = {
    id: user._id,
    username: user.username,
    roles: user.roles,
  }

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })

  ctx.body = {
    success: true,
    data: {
      token,
      user: user.toJSON(),
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
 */
router.get('/me', authMiddleware({ required: true }), async (ctx) => {
  const payload = ctx.state.user as JwtPayload

  const user = await UserModel.findById(payload.id)
  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found.' } }
    return
  }

  ctx.body = { success: true, data: user.toJSON() }
})

export default router
