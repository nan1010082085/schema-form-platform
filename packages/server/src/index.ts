import 'dotenv/config'
import Koa from 'koa'
import cors from '@koa/cors'
import helmet from 'koa-helmet'
import bodyParser from 'koa-bodyparser'
import { errorHandler } from './middleware/errorHandler.js'
import healthRouter from './routes/health.js'
import schemaRouter from './routes/schema.js'

const app = new Koa()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

// --- Middleware stack ---
app.use(errorHandler)
app.use(helmet())
app.use(bodyParser())

app.use(cors({
  origin: (ctx) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
    ]
    const requestOrigin = ctx.get('Origin')
    if (allowedOrigins.includes(requestOrigin)) {
      return requestOrigin
    }
    return ''
  },
  credentials: true,
}))

// --- Routes ---
app.use(healthRouter.routes())
app.use(healthRouter.allowedMethods())
app.use(schemaRouter.routes())
app.use(schemaRouter.allowedMethods())

// --- Start ---
const server = app.listen(PORT, () => {
  console.log(`[server] FormGrid API running at http://localhost:${PORT}`)
  console.log(`[server] Health check: http://localhost:${PORT}/api/health`)
})

// Graceful shutdown
let shuttingDown = false
async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[server] Received ${signal}, shutting down gracefully...`)

  // Stop accepting new connections
  server.close(async () => {
    console.log('[server] HTTP server closed')
    try {
      const { prisma } = await import('./config/database.js')
      await prisma.$disconnect()
      console.log('[server] Prisma disconnected')
    } catch { /* DB might already be closed */ }
    process.exit(0)
  })

  // Force exit after 30s
  setTimeout(() => {
    console.log('[server] Forced shutdown after timeout')
    process.exit(1)
  }, 30_000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export default app
