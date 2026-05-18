import 'dotenv/config'
import Koa from 'koa'
import cors from '@koa/cors'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler.js'
import healthRouter from './routes/health.js'
import schemaRouter from './routes/schema.js'

const app = new Koa()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

// --- Middleware stack ---
app.use(errorHandler)
app.use(helmet())

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
app.listen(PORT, () => {
  console.log(`[server] FormGrid API running at http://localhost:${PORT}`)
  console.log(`[server] Health check: http://localhost:${PORT}/api/health`)
})

export default app
