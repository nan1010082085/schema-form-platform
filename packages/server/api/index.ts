import app from '../src/app.js'
import { connectDatabase } from '../src/config/database.js'

let dbReady = false

export default async function handler(req: any, res: any) {
  if (!dbReady) {
    await connectDatabase()
    dbReady = true
  }
  app.callback()(req, res)
}
