import Router from '@koa/router'
import { prisma } from '../config/database.js'

const router = new Router()

router.get('/api/health', async (ctx) => {
  let dbStatus = 'disconnected'

  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch {
    dbStatus = 'disconnected'
  }

  ctx.body = {
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    database: dbStatus,
  }
})

export default router
