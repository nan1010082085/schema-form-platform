import { connectDatabase, mongoose } from '../packages/server/dist/config/database.js'

let dbReady = false

export default async function handler(req: any, res: any) {
  // MongoDB connection management
  if (!dbReady || mongoose.connection.readyState !== 1) {
    try {
      await connectDatabase()
      dbReady = true
    } catch (err) {
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: false, error: { message: 'Database unavailable' } }))
      return
    }
  }

  const url = req.url || ''

  // Editor-specific routes -> editor-server
  if (url.startsWith('/api/schemas') || url.startsWith('/api/mock') || url.startsWith('/api/docs') || url.startsWith('/api/users')) {
    const mod = await import('../packages/editor/server/dist/app.js')
    return mod.default.callback()(req, res)
  }

  // Shared routes -> shared server (auth, health, data, dict, options, flow-*)
  const mod = await import('../packages/server/dist/handler.js')
  return mod.default(req, res)
}
