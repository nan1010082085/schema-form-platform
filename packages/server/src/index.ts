import 'dotenv/config'
import app from './app.js'
import { connectDatabase, mongoose } from './config/database.js'

const PORT = parseInt(process.env.PORT ?? '3001', 10)

async function start() {
  await connectDatabase()
  const server = app.listen(PORT, () => {
    console.log(`[server] FormGrid API running at http://localhost:${PORT}`)
    console.log(`[server] Health check: http://localhost:${PORT}/api/health`)
  })

  let shuttingDown = false
  async function shutdown(signal: string) {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[server] Received ${signal}, shutting down gracefully...`)

    server.close(async () => {
      console.log('[server] HTTP server closed')
      try {
        await mongoose.disconnect()
        console.log('[server] MongoDB disconnected')
      } catch { /* DB might already be closed */ }
      process.exit(0)
    })

    setTimeout(() => {
      console.log('[server] Forced shutdown after timeout')
      process.exit(1)
    }, 30_000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  return server
}

start()
