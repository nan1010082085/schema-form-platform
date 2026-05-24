import Koa from 'koa'
import cors from '@koa/cors'
import helmet from 'koa-helmet'
import bodyParser from 'koa-bodyparser'
import { errorHandler } from './middleware/errorHandler.js'
import { createRateLimit } from './middleware/rateLimit.js'
import healthRouter from './routes/health.js'
import schemaRouter from './routes/schema.js'
import authRouter from './routes/auth.js'
import dictRouter from './routes/dict.js'
import optionsRouter from './routes/options.js'
import dataRouter from './routes/data.js'
import mockRouter from './routes/mock.js'
import docsRouter from './routes/docs.js'

const app = new Koa()

// --- Middleware stack ---
app.use(errorHandler)
app.use(helmet({ contentSecurityPolicy: false }))
app.use(bodyParser())

app.use(cors({
  origin: (ctx) => {
    const origins = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173'
    if (origins === '*') return ctx.get('Origin')
    const allowed = origins.split(',').map((s) => s.trim())
    const requestOrigin = ctx.get('Origin')
    return allowed.includes(requestOrigin) ? requestOrigin : ''
  },
  credentials: true,
}))

// Rate limiting - must be before routes
app.use(createRateLimit())

// --- Routes ---
app.use(docsRouter.routes())
app.use(docsRouter.allowedMethods())
app.use(healthRouter.routes())
app.use(healthRouter.allowedMethods())
app.use(schemaRouter.routes())
app.use(schemaRouter.allowedMethods())
app.use(authRouter.routes())
app.use(authRouter.allowedMethods())
app.use(dictRouter.routes())
app.use(dictRouter.allowedMethods())
app.use(optionsRouter.routes())
app.use(optionsRouter.allowedMethods())
app.use(dataRouter.routes())
app.use(dataRouter.allowedMethods())
app.use(mockRouter.routes())
app.use(mockRouter.allowedMethods())

export default app
