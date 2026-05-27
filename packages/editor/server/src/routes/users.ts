import Router from '@koa/router'
import { UserModel } from '../models/User.js'
import { authMiddleware } from '../middleware/auth.js'

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

export default router
