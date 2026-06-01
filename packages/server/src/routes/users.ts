import Router from '@koa/router'
import { UserModel } from '../models/User.js'
import { validate } from '../middleware/validate.js'
import { createUserSchema, updateUserSchema, resetPasswordSchema } from '../schemas/userSchemas.js'

const router = new Router({ prefix: '/api/users' })

// GET /api/users?q=xxx&page=1&pageSize=20 — 搜索用户（分页+搜索）
router.get('/', async (ctx) => {
  const q = ctx.query.q as string
  const page = Math.max(1, parseInt(ctx.query.page as string) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(ctx.query.pageSize as string) || 20))

  const filter: Record<string, unknown> = {}
  if (q) {
    filter.$or = [
      { username: { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ]
  }

  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .select('username displayName roles')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    UserModel.countDocuments(filter),
  ])

  ctx.body = {
    success: true,
    data: {
      items: users.map(u => u.toJSON()),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})

// GET /api/users/:id — 获取单个用户
router.get('/:id', async (ctx) => {
  const user = await UserModel.findById(ctx.params.id).select('username displayName roles')
  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }
  ctx.body = { success: true, data: user.toJSON() }
})

// POST /api/users — 创建用户
router.post('/', validate(createUserSchema), async (ctx) => {
  const { username, password, displayName, roles } = ctx.request.body as {
    username: string
    password: string
    displayName: string
    roles: string[]
  }

  const existing = await UserModel.findOne({ username })
  if (existing) {
    ctx.status = 409
    ctx.body = { success: false, error: { message: 'Username already exists.' } }
    return
  }

  const user = await UserModel.create({ username, password, displayName, roles })
  ctx.status = 201
  ctx.body = { success: true, data: user.toJSON() }
})

// PUT /api/users/:id — 更新用户资料/角色
router.put('/:id', validate(updateUserSchema), async (ctx) => {
  const updates = ctx.request.body as { displayName?: string; roles?: string[] }
  const user = await UserModel.findByIdAndUpdate(
    ctx.params.id,
    { $set: updates },
    { new: true, runValidators: true },
  ).select('username displayName roles')

  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }

  ctx.body = { success: true, data: user.toJSON() }
})

// DELETE /api/users/:id — 删除用户
router.delete('/:id', async (ctx) => {
  const user = await UserModel.findByIdAndDelete(ctx.params.id)
  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }

  ctx.body = { success: true, data: null }
})

// PUT /api/users/:id/password — 重置密码
router.put('/:id/password', validate(resetPasswordSchema), async (ctx) => {
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
