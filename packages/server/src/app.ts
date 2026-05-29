import Koa from 'koa'
import cors from '@koa/cors'
import helmet from 'koa-helmet'
import bodyParser from 'koa-bodyparser'
import { errorHandler } from './middleware/errorHandler.js'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import dictRouter from './routes/dict.js'
import optionsRouter from './routes/options.js'
import dataRouter from './routes/data.js'
import schemaRouter from './routes/schema.js'
import mockRouter from './routes/mock.js'
import docsRouter from './routes/docs.js'
import usersRouter from './routes/users.js'
import statsRouter from './routes/stats.js'
import flowRouter from './flow-routes/flow.js'
import flowVersionRouter from './flow-routes/flowVersion.js'
import flowInstanceRouter from './flow-routes/flowInstance.js'
import flowTaskRouter from './flow-routes/flowTask.js'
import flowTimerRouter from './flow-routes/flowTimer.js'
import flowApprovalRouter from './flow-routes/flowApproval.js'

const app = new Koa()

// --- Middleware stack ---
app.use(errorHandler)
app.use(helmet({ contentSecurityPolicy: false }))
app.use(bodyParser())

app.use(cors({
  origin: (ctx) => {
    const origins = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:4173,http://127.0.0.1:5173,https://schema-form-platform.vercel.app'
    if (origins === '*') return ctx.get('Origin')
    const allowed = origins.split(',').map((s) => s.trim())
    const requestOrigin = ctx.get('Origin')
    return allowed.includes(requestOrigin) ? requestOrigin : ''
  },
  credentials: true,
}))

// --- Routes ---
app.use(healthRouter.routes())
app.use(healthRouter.allowedMethods())
app.use(authRouter.routes())
app.use(authRouter.allowedMethods())
app.use(schemaRouter.routes())
app.use(schemaRouter.allowedMethods())
app.use(mockRouter.routes())
app.use(mockRouter.allowedMethods())
app.use(docsRouter.routes())
app.use(docsRouter.allowedMethods())
app.use(usersRouter.routes())
app.use(usersRouter.allowedMethods())
app.use(statsRouter.routes())
app.use(statsRouter.allowedMethods())
app.use(dictRouter.routes())
app.use(dictRouter.allowedMethods())
app.use(optionsRouter.routes())
app.use(optionsRouter.allowedMethods())
app.use(dataRouter.routes())
app.use(dataRouter.allowedMethods())
app.use(flowRouter.routes())
app.use(flowRouter.allowedMethods())
app.use(flowVersionRouter.routes())
app.use(flowVersionRouter.allowedMethods())
app.use(flowInstanceRouter.routes())
app.use(flowInstanceRouter.allowedMethods())
app.use(flowTaskRouter.routes())
app.use(flowTaskRouter.allowedMethods())
app.use(flowTimerRouter.routes())
app.use(flowTimerRouter.allowedMethods())
app.use(flowApprovalRouter.routes())
app.use(flowApprovalRouter.allowedMethods())

export default app
