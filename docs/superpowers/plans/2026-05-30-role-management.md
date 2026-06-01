# 角色管理系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Schema Form Platform 新增完整的角色管理系统，支持用户-角色关联，以及 flow 审批流中按角色配置审批人。

**Architecture:** 采用用户模型内嵌角色ID数组方案，Role 模型独立管理角色信息，User 模型通过 roles 字段关联角色。Flow 的 UserPicker 改造为支持用户/角色混合选择的虚拟列表组件。

**Tech Stack:** Koa.js + MongoDB (Mongoose) + Vue 3 + Element Plus + TypeScript

---

## 文件结构

### 后端 (packages/server)
- `src/models/Role.ts` — Role 模型定义
- `src/models/User.ts` — 更新：roles 字段替代 role
- `src/routes/roles.ts` — 角色 CRUD API
- `src/routes/users.ts` — 更新：适配 roles 字段
- `src/schemas/roleSchemas.ts` — 角色验证 Schema
- `src/schemas/userSchemas.ts` — 更新：适配 roles 字段
- `src/app.ts` — 更新：注册角色路由
- `src/migrations/migrateRoles.ts` — 数据迁移脚本

### Portal 前端 (packages/portal)
- `src/views/RoleManageView.vue` — 角色管理页面
- `src/views/PortalView.vue` — 更新：添加角色管理入口
- `src/views/UserManageView.vue` — 更新：角色多选
- `src/router/index.ts` — 更新：添加角色路由

### Flow 前端 (packages/flow/web)
- `src/components/UserPicker.vue` — 更新：支持用户/角色混合选择
- `src/components/FlowSettingsDialog.vue` — 更新：适配新 UserPicker
- `src/api/flowApi.ts` — 更新：添加角色搜索 API

### Flow Shared (packages/flow/shared)
- `src/types/graph.ts` — 更新：FlowPermissions 类型

---

## Task 1: Role 模型

**Files:**
- Create: `packages/server/src/models/Role.ts`

- [ ] **Step 1: 创建 Role 模型**

```typescript
// packages/server/src/models/Role.ts
import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

export interface IRole {
  _id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

const roleSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true, unique: true },
    description: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
      },
    },
  },
)

export const RoleModel =
  mongoose.models.Role ?? mongoose.model<IRole>('Role', roleSchema)
```

- [ ] **Step 2: 验证模型创建**

在 MongoDB 中手动测试：
```bash
pnpm db:up
```

---

## Task 2: 角色验证 Schema

**Files:**
- Create: `packages/server/src/schemas/roleSchemas.ts`

- [ ] **Step 1: 创建角色验证 Schema**

```typescript
// packages/server/src/schemas/roleSchemas.ts
import { z } from 'zod'

export const createRoleSchema = z.object({
  name: z.string().min(1, '角色名称不能为空').max(50, '角色名称最多50个字符'),
  description: z.string().max(200, '描述最多200个字符').optional(),
}).strict()

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field (name or description) is required.',
})
```

---

## Task 3: 角色 API 路由

**Files:**
- Create: `packages/server/src/routes/roles.ts`

- [ ] **Step 1: 创建角色 API 路由**

```typescript
// packages/server/src/routes/roles.ts
import Router from '@koa/router'
import { RoleModel } from '../models/Role.js'
import { UserModel } from '../models/User.js'
import { validate } from '../middleware/validate.js'
import { createRoleSchema, updateRoleSchema } from '../schemas/roleSchemas.js'

const router = new Router({ prefix: '/api/roles' })

// GET /api/roles?q=xxx&page=1&pageSize=20 — 角色列表（分页+搜索）
router.get('/', async (ctx) => {
  const q = ctx.query.q as string
  const page = Math.max(1, parseInt(ctx.query.page as string) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(ctx.query.pageSize as string) || 20))

  const filter: Record<string, unknown> = {}
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ]
  }

  const [roles, total] = await Promise.all([
    RoleModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    RoleModel.countDocuments(filter),
  ])

  ctx.body = {
    success: true,
    data: {
      items: roles.map(r => r.toJSON()),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})

// POST /api/roles — 创建角色
router.post('/', validate(createRoleSchema), async (ctx) => {
  const { name, description } = ctx.request.body as { name: string; description?: string }

  const existing = await RoleModel.findOne({ name })
  if (existing) {
    ctx.status = 409
    ctx.body = { success: false, error: { message: '角色名称已存在' } }
    return
  }

  const role = await RoleModel.create({ name, description })
  ctx.status = 201
  ctx.body = { success: true, data: role.toJSON() }
})

// PUT /api/roles/:id — 更新角色
router.put('/:id', validate(updateRoleSchema), async (ctx) => {
  const updates = ctx.request.body as { name?: string; description?: string }

  if (updates.name) {
    const existing = await RoleModel.findOne({ name: updates.name, _id: { $ne: ctx.params.id } })
    if (existing) {
      ctx.status = 409
      ctx.body = { success: false, error: { message: '角色名称已存在' } }
      return
    }
  }

  const role = await RoleModel.findByIdAndUpdate(
    ctx.params.id,
    { $set: updates },
    { new: true, runValidators: true },
  )

  if (!role) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: '角色不存在' } }
    return
  }

  ctx.body = { success: true, data: role.toJSON() }
})

// DELETE /api/roles/:id — 删除角色
router.delete('/:id', async (ctx) => {
  const role = await RoleModel.findById(ctx.params.id)
  if (!role) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: '角色不存在' } }
    return
  }

  // 删除角色时，从所有用户的 roles 数组中移除该角色
  await UserModel.updateMany(
    { roles: ctx.params.id },
    { $pull: { roles: ctx.params.id } },
  )

  await RoleModel.findByIdAndDelete(ctx.params.id)
  ctx.body = { success: true, data: null }
})

// GET /api/roles/:id/users — 获取角色下的用户
router.get('/:id/users', async (ctx) => {
  const role = await RoleModel.findById(ctx.params.id)
  if (!role) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: '角色不存在' } }
    return
  }

  const users = await UserModel.find({ roles: ctx.params.id })
    .select('username displayName roles')

  ctx.body = { success: true, data: users.map(u => u.toJSON()) }
})

export default router
```

---

## Task 4: 更新 User 模型

**Files:**
- Modify: `packages/server/src/models/User.ts`

- [ ] **Step 1: 更新 User 模型**

```typescript
// packages/server/src/models/User.ts
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const SALT_ROUNDS = 10

export interface IUser {
  _id: string
  username: string
  password: string
  displayName: string
  roles: string[]  // 角色ID数组
  createdAt: Date
  updatedAt: Date
}

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    displayName: { type: String, required: true },
    roles: { type: [String], default: [] },  // 角色ID数组
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        delete ret.password
      },
    },
  },
)

// 给 roles 字段添加索引，支持反向查询
userSchema.index({ roles: 1 })

userSchema.pre('save', async function (this: IUser & mongoose.Document) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS)
  }
})

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

export const UserModel =
  mongoose.models.User ?? mongoose.model<IUser>('User', userSchema)
```

---

## Task 5: 更新用户验证 Schema

**Files:**
- Modify: `packages/server/src/schemas/userSchemas.ts`

- [ ] **Step 1: 更新用户验证 Schema**

```typescript
// packages/server/src/schemas/userSchemas.ts
import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
  password: z.string().min(4, 'Password must be at least 4 characters').max(100),
  displayName: z.string().min(1, 'Display name is required').max(50),
  roles: z.array(z.string()).default([]),  // 角色ID数组
}).strict()

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  roles: z.array(z.string()).optional(),  // 角色ID数组
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field (displayName or roles) is required.',
})

export const resetPasswordSchema = z.object({
  password: z.string().min(4, 'Password must be at least 4 characters').max(100),
}).strict()
```

---

## Task 6: 更新用户 API 路由

**Files:**
- Modify: `packages/server/src/routes/users.ts`

- [ ] **Step 1: 更新用户 API 路由**

```typescript
// packages/server/src/routes/users.ts
import Router from '@koa/router'
import { UserModel } from '../models/User.js'
import { validate } from '../middleware/validate.js'
import { createUserSchema, updateUserSchema, resetPasswordSchema } from '../schemas/userSchemas.js'

const router = new Router({ prefix: '/api/users' })

// GET /api/users?q=xxx&page=1&pageSize=20 — 搜索用户（分页+搜索）
router.get('/', async (ctx) => {
  const q = ctx.query.q as string
  const page = Math.max(1, parseInt(ctx.query.page as string) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(ctx.query.pageSize as string) || 20))

  const filter: Record<string, unknown> = {}
  if (q) {
    filter.$or = [
      { username: { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ]
  }

  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .select('username displayName roles')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    UserModel.countDocuments(filter),
  ])

  ctx.body = {
    success: true,
    data: {
      items: users.map(u => u.toJSON()),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})

// GET /api/users/:id — 获取单个用户
router.get('/:id', async (ctx) => {
  const user = await UserModel.findById(ctx.params.id).select('username displayName roles')
  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }
  ctx.body = { success: true, data: user.toJSON() }
})

// POST /api/users — 创建用户
router.post('/', validate(createUserSchema), async (ctx) => {
  const { username, password, displayName, roles } = ctx.request.body as {
    username: string
    password: string
    displayName: string
    roles: string[]
  }

  const existing = await UserModel.findOne({ username })
  if (existing) {
    ctx.status = 409
    ctx.body = { success: false, error: { message: 'Username already exists.' } }
    return
  }

  const user = await UserModel.create({ username, password, displayName, roles })
  ctx.status = 201
  ctx.body = { success: true, data: user.toJSON() }
})

// PUT /api/users/:id — 更新用户资料/角色
router.put('/:id', validate(updateUserSchema), async (ctx) => {
  const updates = ctx.request.body as { displayName?: string; roles?: string[] }
  const user = await UserModel.findByIdAndUpdate(
    ctx.params.id,
    { $set: updates },
    { new: true, runValidators: true },
  ).select('username displayName roles')

  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }

  ctx.body = { success: true, data: user.toJSON() }
})

// DELETE /api/users/:id — 删除用户
router.delete('/:id', async (ctx) => {
  const user = await UserModel.findByIdAndDelete(ctx.params.id)
  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }

  ctx.body = { success: true, data: null }
})

// PUT /api/users/:id/password — 重置密码
router.put('/:id/password', validate(resetPasswordSchema), async (ctx) => {
  const { password } = ctx.request.body as { password: string }
  const user = await UserModel.findById(ctx.params.id)
  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }

  user.password = password // pre-save hook will hash
  await user.save()

  ctx.body = { success: true, data: null }
})

export default router
```

---

## Task 7: 注册角色路由

**Files:**
- Modify: `packages/server/src/app.ts`

- [ ] **Step 1: 注册角色路由**

```typescript
// packages/server/src/app.ts
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
import rolesRouter from './routes/roles.js'  // 新增
import statsRouter from './routes/stats.js'
import flowRouter from './flow-routes/flow.js'
import flowVersionRouter from './flow-routes/flowVersion.js'
import flowInstanceRouter from './flow-routes/flowInstance.js'
import flowTaskRouter from './flow-routes/flowTask.js'
import flowTimerRouter from './flow-routes/flowTimer.js'
import flowApprovalRouter from './flow-routes/flowApproval.js'
import { aiRouter } from './ai/index.js'

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
app.use(rolesRouter.routes())  // 新增
app.use(rolesRouter.allowedMethods())  // 新增
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
app.use(aiRouter.routes())
app.use(aiRouter.allowedMethods())

export default app
```

---

## Task 8: 数据迁移脚本

**Files:**
- Create: `packages/server/src/migrations/migrateRoles.ts`

- [ ] **Step 1: 创建数据迁移脚本**

```typescript
// packages/server/src/migrations/migrateRoles.ts
import mongoose from 'mongoose'
import { RoleModel } from '../models/Role.js'
import { UserModel } from '../models/User.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/schema-form'

async function migrateRoles() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    // 1. 创建默认角色
    const defaultRoles = [
      { name: '管理员', description: '系统管理员，拥有所有权限' },
      { name: '编辑者', description: '内容编辑者，可编辑和发布' },
      { name: '查看者', description: '只读用户，仅可查看' },
    ]

    const roleMap: Record<string, string> = {}

    for (const roleData of defaultRoles) {
      let role = await RoleModel.findOne({ name: roleData.name })
      if (!role) {
        role = await RoleModel.create(roleData)
        console.log(`Created role: ${role.name}`)
      } else {
        console.log(`Role already exists: ${role.name}`)
      }
      roleMap[roleData.name] = role._id
    }

    // 2. 迁移用户角色
    const users = await UserModel.find()
    console.log(`Found ${users.length} users to migrate`)

    for (const user of users) {
      // 检查用户是否有旧的 role 字段
      const oldRole = (user as any).role
      if (oldRole && roleMap[oldRole]) {
        user.roles = [roleMap[oldRole]]
        await user.save()
        console.log(`Migrated user ${user.username}: ${oldRole} -> ${roleMap[oldRole]}`)
      } else if (!user.roles || user.roles.length === 0) {
        // 如果没有角色，默认设为查看者
        user.roles = [roleMap['查看者']]
        await user.save()
        console.log(`Set default role for user ${user.username}: 查看者`)
      }
    }

    console.log('Migration completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

// 运行迁移
migrateRoles()
```

---

## Task 9: Portal 路由更新

**Files:**
- Modify: `packages/portal/src/router/index.ts`

- [ ] **Step 1: 添加角色管理路由**

```typescript
// packages/portal/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'portal',
      component: () => import('@/views/PortalView.vue'),
    },
    {
      path: '/editor',
      name: 'editor-embed',
      component: () => import('@/views/EditorView.vue'),
    },
    {
      path: '/flow',
      name: 'flow-embed',
      component: () => import('@/views/FlowView.vue'),
    },
    {
      path: '/ai',
      name: 'ai-embed',
      component: () => import('@/views/AiView.vue'),
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UserManageView.vue'),
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('@/views/RoleManageView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
```

---

## Task 10: PortalView 添加角色管理入口

**Files:**
- Modify: `packages/portal/src/views/PortalView.vue`

- [ ] **Step 1: 添加角色管理卡片**

```vue
<script setup lang="ts">
import { Edit, Connection, ChatLineSquare, User, Document, UserFilled } from '@element-plus/icons-vue'

const cards = [
  {
    title: '表单编辑器',
    desc: '可视化拖拽设计器，30+ 组件开箱即用',
    icon: Edit,
    route: '/editor',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    title: '流程引擎',
    desc: 'BPMN 流程设计器，可视化编排审批流',
    icon: Connection,
    route: '/flow',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    title: 'AI 助手',
    desc: '对话式生成 Schema 与流程定义',
    icon: ChatLineSquare,
    route: '/ai',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    title: '用户管理',
    desc: '管理平台用户、分配角色',
    icon: User,
    route: '/users',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
  {
    title: '角色管理',
    desc: '管理平台角色，配置角色成员',
    icon: UserFilled,
    route: '/roles',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  },
  {
    title: '项目文档',
    desc: '编辑器、流程引擎、后端服务技术文档',
    icon: Document,
    href: '/docs/web.html',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
]
</script>

<template>
  <div :class="$style.page">
    <header :class="$style.header">
      <div :class="$style.headerInner">
        <span :class="$style.logo">Schema Form Platform</span>
      </div>
    </header>

    <main :class="$style.main">
      <section :class="$style.hero">
        <h1 :class="$style.heroTitle">Schema Form Platform</h1>
        <p :class="$style.heroDesc">
          Schema 驱动的可视化表单设计器与流程引擎
        </p>
      </section>

      <div :class="$style.grid">
        <component
          v-for="card in cards"
          :key="card.route || card.href"
          :is="card.href ? 'a' : 'router-link'"
          v-bind="card.href ? { href: card.href, target: '_blank' } : { to: card.route }"
          :class="$style.card"
        >
          <div :class="$style.cardIcon" :style="{ background: card.gradient }">
            <el-icon :size="22" color="#fff"><component :is="card.icon" /></el-icon>
          </div>
          <div :class="$style.cardBody">
            <h2 :class="$style.cardTitle">{{ card.title }}</h2>
            <p :class="$style.cardDesc">{{ card.desc }}</p>
          </div>
        </component>
      </div>
    </main>
  </div>
</template>

<style module>
/* 保持原有样式不变 */
.page {
  min-height: 100vh;
  background: var(--bg-color-page);
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-color-white);
  border-bottom: 1px solid var(--border-color-light);
}

.headerInner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px;
  height: 52px;
  display: flex;
  align-items: center;
}

.logo {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-color-primary);
  letter-spacing: -0.01em;
}

.main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px;
}

.hero {
  padding: 56px 0 48px;
}

.heroTitle {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color-primary);
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.heroDesc {
  font-size: 15px;
  color: var(--text-color-secondary);
  line-height: 1.6;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding-bottom: 64px;
}

.card {
  background: var(--bg-color-white);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  text-decoration: none;
  color: inherit;
}

.card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 16px rgba(0, 96, 162, 0.08);
}

.cardIcon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cardBody {
  flex: 1;
  min-width: 0;
}

.cardTitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: 4px;
}

.cardDesc {
  font-size: 13px;
  color: var(--text-color-secondary);
  line-height: 1.5;
}
</style>
```

---

## Task 11: RoleManageView 角色管理页面

**Files:**
- Create: `packages/portal/src/views/RoleManageView.vue`

- [ ] **Step 1: 创建角色管理页面**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import SubPageLayout from '@/components/SubPageLayout.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

interface Role {
  id: string
  name: string
  description?: string
}

interface User {
  id: string
  username: string
  displayName: string
}

const roles = ref<Role[]>([])
const loading = ref(false)
const searchQuery = ref('')

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({ name: '', description: '' })
const editingId = ref('')

const membersVisible = ref(false)
const currentRole = ref<Role | null>(null)
const members = ref<User[]>([])
const membersLoading = ref(false)

async function fetchRoles() {
  loading.value = true
  try {
    const params = searchQuery.value ? `?q=${encodeURIComponent(searchQuery.value)}` : ''
    const res = await apiClient.get<{ items: Role[] }>(`/roles${params}`)
    roles.value = res.items
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = { name: '', description: '' }
  dialogVisible.value = true
}

function openEdit(role: Role) {
  dialogMode.value = 'edit'
  editingId.value = role.id
  form.value = { name: role.name, description: role.description || '' }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name) {
    ElMessage.warning('请输入角色名称')
    return
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/roles', form.value)
    ElMessage.success('角色创建成功')
  } else {
    await apiClient.put(`/roles/${editingId.value}`, form.value)
    ElMessage.success('角色更新成功')
  }
  dialogVisible.value = false
  fetchRoles()
}

async function handleDelete(role: Role) {
  await ElMessageBox.confirm(`确认删除角色「${role.name}」？删除后该角色下的用户将失去此角色。`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await apiClient.delete(`/roles/${role.id}`)
  ElMessage.success('角色已删除')
  fetchRoles()
}

async function openMembers(role: Role) {
  currentRole.value = role
  membersVisible.value = true
  membersLoading.value = true
  try {
    const res = await apiClient.get<User[]>(`/roles/${role.id}/users`)
    members.value = res
  } finally {
    membersLoading.value = false
  }
}

onMounted(fetchRoles)
</script>

<template>
  <SubPageLayout title="角色管理">
    <div :class="$style.wrapper">
      <div :class="$style.toolbar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索角色名称或描述"
          :prefix-icon="Search"
          clearable
          :class="$style.search"
          @clear="fetchRoles"
          @keyup.enter="fetchRoles"
        />
        <el-button type="primary" :icon="Plus" @click="openCreate">
          新增角色
        </el-button>
      </div>

      <el-table :data="roles" v-loading="loading" :class="$style.table">
        <el-table-column prop="name" label="角色名称" min-width="140" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div :class="$style.actions">
              <el-button text size="small" @click="openMembers(row)">查看成员</el-button>
              <el-button text size="small" @click="openEdit(row)">编辑</el-button>
              <el-button text size="small" type="danger" @click="handleDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增角色' : '编辑角色'"
      width="440px"
      destroy-on-close
    >
      <el-form label-width="70px">
        <el-form-item label="角色名称">
          <el-input v-model="form.name" placeholder="请输入角色名称（如：管理员、部门经理）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="角色描述（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Members Dialog -->
    <el-dialog
      v-model="membersVisible"
      :title="`角色成员 - ${currentRole?.name || ''}`"
      width="500px"
      destroy-on-close
    >
      <el-table :data="members" v-loading="membersLoading" :class="$style.membersTable">
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="displayName" label="显示名" min-width="120" />
      </el-table>
      <div v-if="!membersLoading && members.length === 0" :class="$style.emptyMembers">
        暂无成员
      </div>
    </el-dialog>
  </SubPageLayout>
</template>

<style module>
.wrapper {
  width: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search {
  width: 280px;
}

.table {
  border-radius: 8px;
  overflow: hidden;
}

.actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.membersTable {
  border-radius: 8px;
  overflow: hidden;
}

.emptyMembers {
  text-align: center;
  padding: 24px;
  color: var(--text-color-placeholder);
  font-size: 14px;
}
</style>
```

---

## Task 12: UserManageView 更新

**Files:**
- Modify: `packages/portal/src/views/UserManageView.vue`

- [ ] **Step 1: 更新 UserManageView**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import SubPageLayout from '@/components/SubPageLayout.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

interface User {
  id: string
  username: string
  displayName: string
  roles: string[]
}

interface Role {
  id: string
  name: string
}

const users = ref<User[]>([])
const roles = ref<Role[]>([])
const roleMap = ref<Record<string, string>>({})
const loading = ref(false)
const searchQuery = ref('')

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({ username: '', password: '', displayName: '', roles: [] as string[] })
const editingId = ref('')

const resetPwdVisible = ref(false)
const resetPwdForm = ref({ password: '' })
const resetPwdUserId = ref('')

async function fetchRoles() {
  const res = await apiClient.get<{ items: Role[] }>('/roles')
  roles.value = res.items
  roleMap.value = {}
  for (const role of res.items) {
    roleMap.value[role.id] = role.name
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    const params = searchQuery.value ? `?q=${encodeURIComponent(searchQuery.value)}` : ''
    const res = await apiClient.get<{ items: User[] }>(`/users${params}`)
    users.value = res.items
  } finally {
    loading.value = false
  }
}

function getRoleNames(roleIds: string[]): string[] {
  return roleIds.map(id => roleMap.value[id] || id).filter(Boolean)
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = { username: '', password: '', displayName: '', roles: [] }
  dialogVisible.value = true
}

function openEdit(user: User) {
  dialogMode.value = 'edit'
  editingId.value = user.id
  form.value = { username: user.username, password: '', displayName: user.displayName, roles: [...user.roles] }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (dialogMode.value === 'create') {
    if (!form.value.username || !form.value.password || !form.value.displayName) {
      ElMessage.warning('请填写完整信息')
      return
    }
    await apiClient.post('/users', form.value)
    ElMessage.success('用户创建成功')
  } else {
    await apiClient.put(`/users/${editingId.value}`, {
      displayName: form.value.displayName,
      roles: form.value.roles,
    })
    ElMessage.success('用户更新成功')
  }
  dialogVisible.value = false
  fetchUsers()
}

async function handleDelete(user: User) {
  await ElMessageBox.confirm(`确认删除用户「${user.displayName}」？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await apiClient.delete(`/users/${user.id}`)
  ElMessage.success('用户已删除')
  fetchUsers()
}

function openResetPassword(user: User) {
  resetPwdUserId.value = user.id
  resetPwdForm.value = { password: '' }
  resetPwdVisible.value = true
}

async function handleResetPassword() {
  if (resetPwdForm.value.password.length < 4) {
    ElMessage.warning('密码至少 4 个字符')
    return
  }
  await apiClient.put(`/users/${resetPwdUserId.value}/password`, resetPwdForm.value)
  ElMessage.success('密码已重置')
  resetPwdVisible.value = false
}

onMounted(async () => {
  await fetchRoles()
  await fetchUsers()
})
</script>

<template>
  <SubPageLayout title="用户管理">
    <div :class="$style.wrapper">
      <div :class="$style.toolbar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名或显示名"
          :prefix-icon="Search"
          clearable
          :class="$style.search"
          @clear="fetchUsers"
          @keyup.enter="fetchUsers"
        />
        <el-button type="primary" :icon="Plus" @click="openCreate">
          新增用户
        </el-button>
      </div>

      <el-table :data="users" v-loading="loading" :class="$style.table">
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="displayName" label="显示名" min-width="140" />
        <el-table-column label="角色" min-width="200">
          <template #default="{ row }">
            <el-tag
              v-for="roleName in getRoleNames(row.roles)"
              :key="roleName"
              size="small"
              :class="$style.roleTag"
              disable-transitions
            >
              {{ roleName }}
            </el-tag>
            <span v-if="!row.roles || row.roles.length === 0" :class="$style.noRole">未分配</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div :class="$style.actions">
              <el-button text size="small" @click="openEdit(row)">编辑</el-button>
              <el-button text size="small" @click="openResetPassword(row)">重置密码</el-button>
              <el-button text size="small" type="danger" @click="handleDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增用户' : '编辑用户'"
      width="440px"
      destroy-on-close
    >
      <el-form label-width="70px">
        <el-form-item label="用户名">
          <el-input
            v-model="form.username"
            :disabled="dialogMode === 'edit'"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'create'" label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="显示名">
          <el-input v-model="form.displayName" placeholder="请输入显示名" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roles" multiple placeholder="选择角色" style="width: 100%">
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Reset Password Dialog -->
    <el-dialog v-model="resetPwdVisible" title="重置密码" width="400px" destroy-on-close>
      <el-form label-width="70px">
        <el-form-item label="新密码">
          <el-input v-model="resetPwdForm.password" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" @click="handleResetPassword">确定</el-button>
      </template>
    </el-dialog>
  </SubPageLayout>
</template>

<style module>
.wrapper {
  width: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search {
  width: 280px;
}

.table {
  border-radius: 8px;
  overflow: hidden;
}

.actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.roleTag {
  margin-right: 4px;
  margin-bottom: 2px;
}

.noRole {
  color: var(--text-color-placeholder);
  font-size: 13px;
}
</style>
```

---

## Task 13: Flow Shared 类型更新

**Files:**
- Modify: `packages/flow/shared/src/types/graph.ts`

- [ ] **Step 1: 更新 FlowPermissions 类型**

```typescript
// packages/flow/shared/src/types/graph.ts
import type { BpmnNodeConfig, RejectPolicy } from './bpmn.js'

export interface FlowNodeData {
  id: string
  shape: string
  x: number
  y: number
  width: number
  height: number
  data: BpmnNodeConfig
}

export interface FlowEdgeData {
  id: string
  shape: string
  source: { cell: string; port?: string }
  target: { cell: string; port?: string }
  data: {
    label?: string
    conditionExpression?: string
    isDefault?: boolean
  }
}

export interface FlowGraph {
  nodes: FlowNodeData[]
  edges: FlowEdgeData[]
}

export interface FlowPermissionItem {
  type: 'user' | 'role'
  id: string
}

export interface FlowPermissions {
  editors?: FlowPermissionItem[]
  launchers?: FlowPermissionItem[]
  viewers?: FlowPermissionItem[]
}

export interface FlowGraphMetadata {
  viewport?: { x: number; y: number; zoom: number }
  defaultRejectPolicy?: RejectPolicy
  permissions?: FlowPermissions
}
```

---

## Task 14: Flow API 更新

**Files:**
- Modify: `packages/flow/web/src/api/flowApi.ts`

- [ ] **Step 1: 更新 flowApi**

```typescript
// packages/flow/web/src/api/flowApi.ts
import type {
  CreateFlowDefinitionDto,
  UpdateFlowDefinitionDto,
  SaveFlowVersionDto,
  StartFlowInstanceDto,
  CompleteTaskDto,
  DelegateTaskDto,
  FlowListQuery,
  FlowInstanceQuery,
  FlowDefinitionData,
  FlowVersionData,
  FlowInstanceData,
  TaskInstanceData,
  ApprovalLogEntry,
  FlowDefinitionListData,
  FlowVersionListData,
  FlowInstanceListData,
  TaskInstanceListData,
  ApprovalLogListData,
} from '@schema-form/flow-shared'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message ?? 'Request failed')
  return json.data
}

export const flowApi = {
  // Flow definitions
  listFlows: (query?: FlowListQuery) => {
    const params = new URLSearchParams()
    if (query?.search) params.set('search', query.search)
    if (query?.status) params.set('status', query.status)
    if (query?.page) params.set('page', String(query.page))
    if (query?.pageSize) params.set('pageSize', String(query.pageSize))
    return request<FlowDefinitionListData>(`/flows?${params}`)
  },

  getFlow: (id: string) => request<FlowDefinitionData>(`/flows/${id}`),

  createFlow: (data: CreateFlowDefinitionDto) =>
    request<FlowDefinitionData>('/flows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFlow: (id: string, data: UpdateFlowDefinitionDto) =>
    request<FlowDefinitionData>(`/flows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteFlow: (id: string) =>
    request<null>(`/flows/${id}`, { method: 'DELETE' }),

  publishFlow: (id: string) =>
    request<FlowDefinitionData>(`/flows/${id}/publish`, { method: 'POST' }),

  // Versions
  listVersions: (definitionId: string, page?: number, pageSize?: number) => {
    const params = new URLSearchParams()
    if (page) params.set('page', String(page))
    if (pageSize) params.set('pageSize', String(pageSize))
    return request<FlowVersionListData>(`/flows/${definitionId}/versions?${params}`)
  },

  getVersion: (definitionId: string, versionId: string) =>
    request<FlowVersionData>(`/flows/${definitionId}/versions/${versionId}`),

  getLatestVersion: (definitionId: string) =>
    request<FlowVersionData>(`/flows/${definitionId}/versions/latest`),

  saveVersion: (definitionId: string, data: SaveFlowVersionDto) =>
    request<FlowVersionData>(`/flows/${definitionId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Instances
  listInstances: (query?: FlowInstanceQuery) => {
    const params = new URLSearchParams()
    if (query?.definitionId) params.set('definitionId', query.definitionId)
    if (query?.status) params.set('status', query.status)
    if (query?.page) params.set('page', String(query.page))
    if (query?.pageSize) params.set('pageSize', String(query.pageSize))
    return request<FlowInstanceListData>(`/flow-instances?${params}`)
  },

  getInstance: (id: string) => request<FlowInstanceData>(`/flow-instances/${id}`),

  startInstance: (data: StartFlowInstanceDto) =>
    request<FlowInstanceData>('/flow-instances', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  terminateInstance: (id: string) =>
    request<FlowInstanceData>(`/flow-instances/${id}/terminate`, { method: 'POST' }),

  suspendInstance: (id: string) =>
    request<FlowInstanceData>(`/flow-instances/${id}/suspend`, { method: 'POST' }),

  resumeInstance: (id: string) =>
    request<FlowInstanceData>(`/flow-instances/${id}/resume`, { method: 'POST' }),

  // Tasks
  getMyTasks: (page?: number, pageSize?: number) => {
    const params = new URLSearchParams()
    if (page) params.set('page', String(page))
    if (pageSize) params.set('pageSize', String(pageSize))
    return request<TaskInstanceListData>(`/flow-tasks/my?${params}`)
  },

  getTask: (id: string) => request<TaskInstanceData>(`/flow-tasks/${id}`),

  claimTask: (id: string) =>
    request<TaskInstanceData>(`/flow-tasks/${id}/claim`, { method: 'POST' }),

  completeTask: (id: string, data: CompleteTaskDto) =>
    request<TaskInstanceData>(`/flow-tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delegateTask: (id: string, data: DelegateTaskDto) =>
    request<TaskInstanceData>(`/flow-tasks/${id}/delegate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Users - 支持分页
  searchUsers: (q: string, page?: number, pageSize?: number) => {
    const params = new URLSearchParams({ q })
    if (page) params.set('page', String(page))
    if (pageSize) params.set('pageSize', String(pageSize))
    return request<{ items: Array<{ id: string; username: string; displayName: string; roles: string[] }>; total: number }>(`/users?${params}`)
  },

  // Roles - 新增
  searchRoles: (q: string, page?: number, pageSize?: number) => {
    const params = new URLSearchParams({ q })
    if (page) params.set('page', String(page))
    if (pageSize) params.set('pageSize', String(pageSize))
    return request<{ items: Array<{ id: string; name: string; description?: string }>; total: number }>(`/roles?${params}`)
  },

  // Approval logs
  getApprovalLogs: (instanceId: string) => {
    const params = new URLSearchParams({ instanceId })
    return request<ApprovalLogListData>(`/flow-approvals?${params}`)
  },

  // Published forms (editor-server)
  getPublishedForms: () =>
    request<Array<{ id: string; publishId: string; name: string }>>('/schemas/published'),
}
```

---

## Task 15: UserPicker 改造

**Files:**
- Modify: `packages/flow/web/src/components/UserPicker.vue`

- [ ] **Step 1: 改造 UserPicker 支持用户/角色混合选择**

```vue
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { flowApi } from '../api/flowApi.js'

interface User {
  id: string
  username: string
  displayName: string
  roles: string[]
}

interface Role {
  id: string
  name: string
  description?: string
}

interface SelectOption {
  value: string
  label: string
  type: 'user' | 'role'
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue?: string[]
  placeholder?: string
}>(), {
  placeholder: '搜索用户或角色...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const options = ref<SelectOption[]>([])
const loading = ref(false)
const searchQuery = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const hasMore = ref(true)

let timer: ReturnType<typeof setTimeout> | null = null

function formatUserLabel(user: User): string {
  return `${user.displayName} (${user.username})`
}

function formatRoleLabel(role: Role): string {
  return role.description ? `${role.name} - ${role.description}` : role.name
}

async function loadData(reset = false) {
  if (reset) {
    page.value = 1
    hasMore.value = true
    options.value = []
  }

  if (!hasMore.value || loading.value) return

  loading.value = true
  try {
    const [usersRes, rolesRes] = await Promise.all([
      flowApi.searchUsers(searchQuery.value, page.value, pageSize),
      flowApi.searchRoles(searchQuery.value, page.value, pageSize),
    ])

    const newOptions: SelectOption[] = []

    // 添加用户选项
    for (const user of usersRes.items) {
      newOptions.push({
        value: `user:${user.id}`,
        label: formatUserLabel(user),
        type: 'user',
      })
    }

    // 添加角色选项
    for (const role of rolesRes.items) {
      newOptions.push({
        value: `role:${role.id}`,
        label: formatRoleLabel(role),
        type: 'role',
      })
    }

    if (reset) {
      options.value = newOptions
    } else {
      options.value = [...options.value, ...newOptions]
    }

    total.value = usersRes.total + rolesRes.total
    hasMore.value = options.value.length < total.value
    page.value++
  } catch (error) {
    console.error('Failed to load data:', error)
  } finally {
    loading.value = false
  }
}

function onSearch(q: string) {
  if (timer) clearTimeout(timer)
  searchQuery.value = q
  timer = setTimeout(() => loadData(true), 300)
}

function onVisibleChange(visible: boolean) {
  if (visible && options.value.length === 0) {
    loadData(true)
  }
}

function onScroll(event: Event) {
  const target = event.target as HTMLElement
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
    loadData()
  }
}

function onChange(val: string[]) {
  emit('update:modelValue', val)
}

function getDisplayLabel(value: string): string {
  const option = options.value.find(o => o.value === value)
  return option?.label || value
}

onMounted(() => {
  // 初始化时不加载，等下拉框打开时再加载
})

watch(() => props.modelValue, (val) => {
  // 确保选中的值在选项中存在
  if (val) {
    for (const v of val) {
      if (!options.value.find(o => o.value === v)) {
        // 如果选项中不存在，可能是已选择但未加载的项
        // 这里可以触发加载，或者显示为标签
      }
    }
  }
}, { immediate: true })
</script>

<template>
  <el-select
    :model-value="modelValue"
    multiple
    filterable
    remote
    reserve-keyword
    :placeholder="placeholder"
    :remote-method="onSearch"
    :loading="loading"
    @change="onChange"
    @visible-change="onVisibleChange"
  >
    <div :class="$style.optionList" @scroll="onScroll">
      <el-option
        v-for="item in options"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      >
        <div :class="$style.optionItem">
          <el-tag
            :type="item.type === 'user' ? '' : 'warning'"
            size="small"
            :class="$style.typeTag"
          >
            {{ item.type === 'user' ? '用户' : '角色' }}
          </el-tag>
          <span :class="$style.optionLabel">{{ item.label }}</span>
        </div>
      </el-option>
      <div v-if="loading" :class="$style.loading">加载中...</div>
      <div v-if="!hasMore && options.length > 0" :class="$style.noMore">没有更多了</div>
      <div v-if="!loading && options.length === 0" :class="$style.empty">暂无数据</div>
    </div>
  </el-select>
</template>

<style module>
.optionList {
  max-height: 300px;
  overflow-y: auto;
}

.optionItem {
  display: flex;
  align-items: center;
  gap: 8px;
}

.typeTag {
  flex-shrink: 0;
}

.optionLabel {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading,
.noMore,
.empty {
  text-align: center;
  padding: 8px;
  font-size: 12px;
  color: var(--text-color-placeholder);
}
</style>
```

---

## Task 16: FlowSettingsDialog 更新

**Files:**
- Modify: `packages/flow/web/src/components/FlowSettingsDialog.vue`

- [ ] **Step 1: 更新 FlowSettingsDialog**

```vue
<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { FlowPermissions, FlowPermissionItem } from '@schema-form/flow-shared'
import UserPicker from './UserPicker.vue'

interface SettingsData {
  name: string
  description: string
  category: string
  permissions: FlowPermissions
  defaultRejectPolicy: 'reject-on-all' | 'reject-on-any'
}

const props = defineProps<{
  visible: boolean
  settings: SettingsData
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [settings: SettingsData]
}>()

const form = reactive<SettingsData>({
  name: '',
  description: '',
  category: '',
  permissions: { editors: [], launchers: [], viewers: [] },
  defaultRejectPolicy: 'reject-on-all',
})

watch(() => props.visible, (v) => {
  if (v) {
    form.name = props.settings.name
    form.description = props.settings.description
    form.category = props.settings.category
    form.permissions = {
      editors: [...(props.settings.permissions.editors ?? [])],
      launchers: [...(props.settings.permissions.launchers ?? [])],
      viewers: [...(props.settings.permissions.viewers ?? [])],
    }
    form.defaultRejectPolicy = props.settings.defaultRejectPolicy
  }
})

// 将 FlowPermissionItem[] 转换为 string[] 供 UserPicker 使用
function permissionItemsToStrings(items: FlowPermissionItem[]): string[] {
  return items.map(item => `${item.type}:${item.id}`)
}

// 将 string[] 转换为 FlowPermissionItem[]
function stringsToPermissionItems(strings: string[]): FlowPermissionItem[] {
  return strings.map(str => {
    const [type, id] = str.split(':')
    return { type: type as 'user' | 'role', id }
  })
}

function onCancel() {
  emit('update:visible', false)
}

function onSave() {
  emit('save', {
    name: form.name,
    description: form.description,
    category: form.category,
    permissions: {
      editors: form.permissions.editors ?? [],
      launchers: form.permissions.launchers ?? [],
      viewers: form.permissions.viewers ?? [],
    },
    defaultRejectPolicy: form.defaultRejectPolicy,
  })
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    title="流程设置"
    :model-value="visible"
    width="560px"
    :close-on-click-modal="false"
    @close="onCancel"
  >
    <div :class="$style.settingsForm">
      <div :class="$style.field">
        <label :class="$style.fieldLabel">流程名称</label>
        <el-input v-model="form.name" placeholder="输入流程名称" />
      </div>

      <div :class="$style.field">
        <label :class="$style.fieldLabel">描述</label>
        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="流程描述" />
      </div>

      <div :class="$style.field">
        <label :class="$style.fieldLabel">分类</label>
        <el-input v-model="form.category" placeholder="输入流程分类" />
      </div>

      <el-divider />

      <div :class="$style.sectionHeader">流程权限</div>

      <div :class="$style.field">
        <label :class="$style.fieldLabel">编辑权限</label>
        <UserPicker
          :model-value="permissionItemsToStrings(form.permissions.editors ?? [])"
          placeholder="选择可编辑的用户或角色"
          @update:model-value="form.permissions.editors = stringsToPermissionItems($event)"
        />
      </div>

      <div :class="$style.field">
        <label :class="$style.fieldLabel">发起权限</label>
        <UserPicker
          :model-value="permissionItemsToStrings(form.permissions.launchers ?? [])"
          placeholder="选择可发起的用户或角色"
          @update:model-value="form.permissions.launchers = stringsToPermissionItems($event)"
        />
        <div :class="$style.fieldHint">留空表示所有人可发起</div>
      </div>

      <div :class="$style.field">
        <label :class="$style.fieldLabel">查看权限</label>
        <UserPicker
          :model-value="permissionItemsToStrings(form.permissions.viewers ?? [])"
          placeholder="选择可查看的用户或角色"
          @update:model-value="form.permissions.viewers = stringsToPermissionItems($event)"
        />
      </div>

      <el-divider />

      <div :class="$style.field">
        <label :class="$style.fieldLabel">默认驳回策略</label>
        <el-radio-group v-model="form.defaultRejectPolicy">
          <el-radio value="reject-on-all">全部驳回才驳回</el-radio>
          <el-radio value="reject-on-any">一票驳回即驳回</el-radio>
        </el-radio-group>
      </div>
    </div>

    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style module>
.settingsForm {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fieldLabel {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.fieldHint {
  font-size: 12px;
  color: var(--text-color-placeholder);
  margin-top: 2px;
}

.sectionHeader {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: 4px;
}
</style>
```

---

## 实施顺序

1. **Phase 1: 后端基础** (Task 1-8)
   - Role 模型、验证 Schema、API 路由
   - User 模型更新、验证 Schema、API 路由
   - 注册路由、数据迁移脚本

2. **Phase 2: Portal 前端** (Task 9-12)
   - 路由更新、PortalView 入口
   - RoleManageView、UserManageView 更新

3. **Phase 3: Flow 集成** (Task 13-16)
   - Shared 类型更新、flowApi 更新
   - UserPicker 改造、FlowSettingsDialog 更新

4. **Phase 4: 测试与验证**
   - 启动后端服务，运行迁移脚本
   - 测试角色 CRUD API
   - 测试 Portal 角色管理界面
   - 测试 Flow UserPicker 选择用户/角色
   - 构建前端：`pnpm build:web`

---

## 验证步骤

1. **后端验证**
   ```bash
   pnpm dev:server
   # 测试 API
   curl http://localhost:3001/api/roles
   curl -X POST http://localhost:3001/api/roles -H "Content-Type: application/json" -d '{"name":"测试角色","description":"测试"}'
   ```

2. **数据迁移**
   ```bash
   npx tsx packages/server/src/migrations/migrateRoles.ts
   ```

3. **前端验证**
   ```bash
   pnpm dev:web
   # 访问 http://localhost:5173/roles
   # 测试角色管理界面
   # 访问 http://localhost:5173/users
   # 测试用户角色选择
   ```

4. **Flow 集成验证**
   ```bash
   pnpm --filter @schema-form/flow-web dev
   # 测试 FlowSettingsDialog 中的 UserPicker
   ```
