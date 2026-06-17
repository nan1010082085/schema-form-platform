/**
 * 删除数据库中的所有 Schema 实例数据
 *
 * 使用方式：
 *   node scripts/delete-schemas.js
 *
 * 注意：此操作不可逆，请确保已备份数据
 */
const mongoose = require('mongoose')

const MONGODB_URI = process.env.MONGODB_URI ||
  'mongodb://formgrid:***REMOVED***@***REMOVED***:27018/schema-form?authSource=admin'

async function main() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  const db = mongoose.connection.db

  // 删除 FormSchema collection 中的所有文档
  const result = await db.collection('formschemas').deleteMany({})
  console.log(`Deleted ${result.deletedCount} schemas from formschemas collection`)

  // 删除 PublishedSchema collection 中的所有文档（如果存在）
  try {
    const pubResult = await db.collection('publishedschemas').deleteMany({})
    console.log(`Deleted ${pubResult.deletedCount} schemas from publishedschemas collection`)
  } catch {
    console.log('publishedschemas collection not found or empty')
  }

  await mongoose.disconnect()
  console.log('Disconnected from MongoDB')
  console.log('Done!')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
