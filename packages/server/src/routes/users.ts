import Router from '@koa/router'
import { UserModel } from '../models/User.js'
import { authMiddleware } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createUserSchema, updateUserSchema, resetPasswordSchema } from '../schemas/userSchemas.js'

const requireAuth = authMiddleware({ required: true })

const router = new Router({ prefix: '/api/users' })

// GET /api/users?q=xxx — search users by username/displayName
router.get('/', requireAuth, async (ctx) => {
  const q = ctx.query.q as string
  const filter: Record<string, unknown> = {}
  if (q) {
    filter.$or = [
      { username: { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ]
  }
  const users = await UserModel.find(filter).limit(20).select('username displayName role')
  ctx.body = { success: true, data: users.map(u => u.toJSON()) }
})

// GET /api/users/:id — get single user
router.get('/:id', requireAuth, async (ctx) => {
  const user = await UserModel.findById(ctx.params.id).select('username displayName role')
  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }
  ctx.body = { success: true, data: user.toJSON() }
})

// POST /api/users — create user
router.post('/', requireAuth, validate(createUserSchema), async (ctx) => {
  const { username, password, displayName, role } = ctx.request.body as {
    username: string
    password: string
    displayName: string
    role: 'admin' | 'editor' | 'viewer'
  }

  const existing = await UserModel.findOne({ username })
  if (existing) {
    ctx.status = 409
    ctx.body = { success: false, error: { message: 'Username already exists.' } }
    return
  }

  const user = await UserModel.create({ username, password, displayName, role })
  ctx.status = 201
  ctx.body = { success: true, data: user.toJSON() }
})

// PUT /api/users/:id — update user profile/role
router.put('/:id', requireAuth, validate(updateUserSchema), async (ctx) => {
  const updates = ctx.request.body as { displayName?: string; role?: string }
  const user = await UserModel.findByIdAndUpdate(
    ctx.params.id,
    { $set: updates },
    { new: true, runValidators: true },
  ).select('username displayName role')

  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }

  ctx.body = { success: true, data: user.toJSON() }
})

// DELETE /api/users/:id — delete user
router.delete('/:id', requireAuth, async (ctx) => {
  const user = await UserModel.findByIdAndDelete(ctx.params.id)
  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }

  ctx.body = { success: true, data: null }
})

// PUT /api/users/:id/password — reset password
router.put('/:id/password', requireAuth, validate(resetPasswordSchema), async (ctx) => {
  const { password } = ctx.request.body as { password: string }
  const user = await UserModel.findById(ctx.params.id)
  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }

  user.password = password // pre-save hook will hash
  await user.save()

  ctx.body = { success: true, data: null }
})

export default router
