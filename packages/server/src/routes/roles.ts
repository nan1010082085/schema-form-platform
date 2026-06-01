import Router from '@koa/router'
import { RoleModel } from '../models/Role.js'
import { UserModel } from '../models/User.js'
import { validate } from '../middleware/validate.js'
import { createRoleSchema, updateRoleSchema } from '../schemas/roleSchemas.js'

const router = new Router({ prefix: '/api/roles' })

// GET /api/roles?q=xxx&page=1&pageSize=20 — 角色列表（分页+搜索）
router.get('/', async (ctx) => {
  const q = ctx.query.q as string
  const page = Math.max(1, parseInt(ctx.query.page as string) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(ctx.query.pageSize as string) || 20))

  const filter: Record<string, unknown> = {}
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ]
  }

  const [roles, total] = await Promise.all([
    RoleModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    RoleModel.countDocuments(filter),
  ])

  ctx.body = {
    success: true,
    data: {
      items: roles.map(r => r.toJSON()),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})

// POST /api/roles — 创建角色
router.post('/', validate(createRoleSchema), async (ctx) => {
  const { name, description } = ctx.request.body as { name: string; description?: string }

  const existing = await RoleModel.findOne({ name })
  if (existing) {
    ctx.status = 409
    ctx.body = { success: false, error: { message: '角色名称已存在' } }
    return
  }

  const role = await RoleModel.create({ name, description })
  ctx.status = 201
  ctx.body = { success: true, data: role.toJSON() }
})

// PUT /api/roles/:id — 更新角色
router.put('/:id', validate(updateRoleSchema), async (ctx) => {
  const updates = ctx.request.body as { name?: string; description?: string }

  if (updates.name) {
    const existing = await RoleModel.findOne({ name: updates.name, _id: { $ne: ctx.params.id } })
    if (existing) {
      ctx.status = 409
      ctx.body = { success: false, error: { message: '角色名称已存在' } }
      return
    }
  }

  const role = await RoleModel.findByIdAndUpdate(
    ctx.params.id,
    { $set: updates },
    { new: true, runValidators: true },
  )

  if (!role) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: '角色不存在' } }
    return
  }

  ctx.body = { success: true, data: role.toJSON() }
})

// DELETE /api/roles/:id — 删除角色
router.delete('/:id', async (ctx) => {
  const role = await RoleModel.findById(ctx.params.id)
  if (!role) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: '角色不存在' } }
    return
  }

  // 删除角色时，从所有用户的 roles 数组中移除该角色
  await UserModel.updateMany(
    { roles: ctx.params.id },
    { $pull: { roles: ctx.params.id } },
  )

  await RoleModel.findByIdAndDelete(ctx.params.id)
  ctx.body = { success: true, data: null }
})

// GET /api/roles/:id/users — 获取角色下的用户
router.get('/:id/users', async (ctx) => {
  const role = await RoleModel.findById(ctx.params.id)
  if (!role) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: '角色不存在' } }
    return
  }

  const users = await UserModel.find({ roles: ctx.params.id })
    .select('username displayName roles')

  ctx.body = { success: true, data: users.map(u => u.toJSON()) }
})

export default router
