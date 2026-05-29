import Router from '@koa/router'
import { FormSchemaModel } from '../models/FormSchema.js'
import { UserModel } from '../models/User.js'
import { authMiddleware } from '../middleware/auth.js'

const requireAuth = authMiddleware({ required: true })

const router = new Router({ prefix: '/api/stats' })

router.get('/', requireAuth, async (ctx) => {
  const [totalSchemas, publishedSchemas, totalUsers] = await Promise.all([
    FormSchemaModel.countDocuments(),
    FormSchemaModel.countDocuments({ status: 'published' }),
    UserModel.countDocuments(),
  ])

  ctx.body = {
    success: true,
    data: {
      schemas: { total: totalSchemas, published: publishedSchemas },
      users: { total: totalUsers },
    },
  }
})

export default router
