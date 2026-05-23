/**
 * Database seed script.
 * Run: pnpm db:seed (or: cd packages/server && tsx seed.ts)
 */
import { connectDatabase, mongoose } from './src/config/database.js'
import { UserModel } from './src/models/User.js'
import { FormSchemaModel } from './src/models/FormSchema.js'
import { v4 as uuidv4 } from 'uuid'

async function seed() {
  await connectDatabase()

  // --- Admin user ---
  const existingAdmin = await UserModel.findOne({ username: 'admin' })
  if (existingAdmin) {
    console.log('[seed] Admin user already exists, skipping.')
  } else {
    await UserModel.create({
      _id: uuidv4(),
      username: 'admin',
      password: 'admin123', // pre-save hook will auto-hash
      displayName: '管理员',
      role: 'admin',
    })
    console.log('[seed] Admin user created (admin / admin123)')
  }

  // --- Sample schema ---
  const existingSchema = await FormSchemaModel.findOne({ name: '示例表单' })
  if (existingSchema) {
    console.log('[seed] Sample schema already exists, skipping.')
  } else {
    await FormSchemaModel.create({
      _id: uuidv4(),
      editId: uuidv4(),
      version: generateVersion(),
      name: '示例表单',
      type: 'form',
      json: [
        {
          id: uuidv4(),
          type: 'card',
          props: { title: '基本信息' },
          children: [
            {
              id: uuidv4(),
              type: 'input',
              props: { label: '姓名', field: 'name', placeholder: '请输入姓名', required: true },
            },
            {
              id: uuidv4(),
              type: 'select',
              props: {
                label: '部门',
                field: 'department',
                placeholder: '请选择部门',
                dictCode: 'department',
              },
            },
            {
              id: uuidv4(),
              type: 'radio',
              props: {
                label: '状态',
                field: 'status',
                dictCode: 'status',
              },
            },
          ],
        },
      ],
    })
    console.log('[seed] Sample schema created (示例表单)')
  }

  await mongoose.disconnect()
  console.log('[seed] Done.')
}

function generateVersion(): string {
  const now = new Date()
  const pad = (n: number, len: number) => String(n).padStart(len, '0')
  return (
    pad(now.getFullYear(), 4) +
    pad(now.getMonth() + 1, 2) +
    pad(now.getDate(), 2) +
    pad(now.getHours(), 2) +
    pad(now.getMinutes(), 2) +
    pad(now.getSeconds(), 2)
  )
}

seed().catch((err) => {
  console.error('[seed] Failed:', err)
  process.exit(1)
})
