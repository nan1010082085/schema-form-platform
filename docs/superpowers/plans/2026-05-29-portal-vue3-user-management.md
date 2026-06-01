# Portal Vue 3 + 用户管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 packages/portal 从静态 HTML 改造为 Vue 3 项目，新增用户管理和概览仪表盘，通过 micro-app 嵌入 editor/flow。

**Architecture:** Portal 作为独立 Vue 3 SPA + micro-app 主应用。Server 端补充用户 CRUD 和统计 API。开发时 portal(5175)、editor(5173)、flow(5174) 独立运行；生产构建时 editor/flow dist 拷贝到 portal/public 下由 micro-app 加载。

**Tech Stack:** Vue 3, Vite, Element Plus, Pinia, Vue Router 4, @micro-zoe/micro-app, Koa, Mongoose, Zod

---

## File Map

### Server（修改已有文件 + 新增 2 个文件）

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `packages/server/src/routes/users.ts` | 补充 POST/PUT/DELETE + 重置密码 |
| 新增 | `packages/server/src/schemas/userSchemas.ts` | 用户相关 Zod 校验 |
| 新增 | `packages/server/src/routes/stats.ts` | GET /api/stats 统计接口 |

### Portal（全新项目）

| 操作 | 文件 | 职责 |
|------|------|------|
| 新增 | `packages/portal/package.json` | 项目依赖 |
| 新增 | `packages/portal/vite.config.ts` | Vite 配置（端口 5175，API 代理） |
| 新增 | `packages/portal/tsconfig.json` | TS 项目引用 |
| 新增 | `packages/portal/tsconfig.app.json` | 应用 TS 配置 |
| 新增 | `packages/portal/tsconfig.node.json` | Node TS 配置 |
| 新增 | `packages/portal/index.html` | HTML 入口 |
| 新增 | `packages/portal/src/main.ts` | Vue + micro-app 初始化 |
| 新增 | `packages/portal/src/App.vue` | 根组件 |
| 新增 | `packages/portal/src/env.d.ts` | 类型声明 |
| 新增 | `packages/portal/src/router/index.ts` | 路由 + 守卫 |
| 新增 | `packages/portal/src/stores/auth.ts` | 认证状态 |
| 新增 | `packages/portal/src/utils/apiClient.ts` | API 客户端（精简版） |
| 新增 | `packages/portal/src/views/LoginView.vue` | 登录页 |
| 新增 | `packages/portal/src/views/PortalView.vue` | 卡片入口页 |
| 新增 | `packages/portal/src/views/DashboardView.vue` | 统计概览 |
| 新增 | `packages/portal/src/views/UserManageView.vue` | 用户 CRUD |
| 新增 | `packages/portal/src/views/EditorView.vue` | micro-app 嵌入 editor |
| 新增 | `packages/portal/src/views/FlowView.vue` | micro-app 嵌入 flow |
| 新增 | `packages/portal/src/components/SubPageLayout.vue` | 子页面顶栏 |

---

## Task 1: Server — 用户 CRUD API

**Files:**
- Create: `packages/server/src/schemas/userSchemas.ts`
- Modify: `packages/server/src/routes/users.ts`
- Modify: `packages/server/src/app.ts`（无需修改，usersRouter 已注册）

- [ ] **Step 1: 创建 userSchemas.ts**

```typescript
// packages/server/src/schemas/userSchemas.ts
import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
  password: z.string().min(4, 'Password must be at least 4 characters').max(100),
  displayName: z.string().min(1, 'Display name is required').max(50),
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
}).strict()

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field (displayName or role) is required.',
})

export const resetPasswordSchema = z.object({
  password: z.string().min(4, 'Password must be at least 4 characters').max(100),
}).strict()
```

- [ ] **Step 2: 扩展 users.ts 路由**

在 `packages/server/src/routes/users.ts` 末尾 `export default router` 之前添加：

```typescript
import { validate } from '../middleware/validate.js'
import { createUserSchema, updateUserSchema, resetPasswordSchema } from '../schemas/userSchemas.js'

// POST /api/users — create user (admin only)
router.post('/', requireAuth, validate(createUserSchema), async (ctx) => {
  const { username, password, displayName, role } = ctx.request.body as {
    username: string
    password: string
    displayName: string
    role: 'admin' | 'editor' | 'viewer'
  }

  const existing = await UserModel.findOne({ username })
  if (existing) {
    ctx.status = 409
    ctx.body = { success: false, error: { message: 'Username already exists.' } }
    return
  }

  const user = await UserModel.create({ username, password, displayName, role })
  ctx.status = 201
  ctx.body = { success: true, data: user.toJSON() }
})

// PUT /api/users/:id — update user profile/role
router.put('/:id', requireAuth, validate(updateUserSchema), async (ctx) => {
  const updates = ctx.request.body as { displayName?: string; role?: string }
  const user = await UserModel.findByIdAndUpdate(
    ctx.params.id,
    { $set: updates },
    { new: true, runValidators: true },
  ).select('username displayName role')

  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }

  ctx.body = { success: true, data: user.toJSON() }
})

// DELETE /api/users/:id — delete user
router.delete('/:id', requireAuth, async (ctx) => {
  const user = await UserModel.findByIdAndDelete(ctx.params.id)
  if (!user) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'User not found' } }
    return
  }

  ctx.body = { success: true, data: null }
})

// PUT /api/users/:id/password — reset password
router.put('/:id/password', requireAuth, validate(resetPasswordSchema), async (ctx) => {
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
```

- [ ] **Step 3: 验证编译通过**

```bash
cd packages/server && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/schemas/userSchemas.ts packages/server/src/routes/users.ts
git commit -m "feat(server): add user CRUD API — create, update, delete, reset password"
```

---

## Task 2: Server — 统计 API

**Files:**
- Create: `packages/server/src/routes/stats.ts`
- Modify: `packages/server/src/app.ts:14`（注册路由）

- [ ] **Step 1: 创建 stats.ts**

```typescript
// packages/server/src/routes/stats.ts
import Router from '@koa/router'
import { FormSchemaModel } from '../models/FormSchema.js'
import { UserModel } from '../models/User.js'
import { authMiddleware } from '../middleware/auth.js'

const requireAuth = authMiddleware({ required: true })

const router = new Router({ prefix: '/api/stats' })

router.get('/', requireAuth, async (ctx) => {
  const [totalSchemas, publishedSchemas, totalUsers] = await Promise.all([
    FormSchemaModel.countDocuments(),
    FormSchemaModel.countDocuments({ status: 'published' }),
    UserModel.countDocuments(),
  ])

  ctx.body = {
    success: true,
    data: {
      schemas: { total: totalSchemas, published: publishedSchemas },
      users: { total: totalUsers },
    },
  }
})

export default router
```

- [ ] **Step 2: 在 app.ts 注册路由**

在 `packages/server/src/app.ts` 中 `import usersRouter` 之后添加：

```typescript
import statsRouter from './routes/stats.js'
```

在 `app.use(usersRouter.allowedMethods())` 之后添加：

```typescript
app.use(statsRouter.routes())
app.use(statsRouter.allowedMethods())
```

- [ ] **Step 3: 验证编译通过**

```bash
cd packages/server && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routes/stats.ts packages/server/src/app.ts
git commit -m "feat(server): add GET /api/stats for dashboard"
```

---

## Task 3: Portal — 项目脚手架

**Files:**
- Create: `packages/portal/package.json`
- Create: `packages/portal/vite.config.ts`
- Create: `packages/portal/tsconfig.json`
- Create: `packages/portal/tsconfig.app.json`
- Create: `packages/portal/tsconfig.node.json`
- Create: `packages/portal/index.html`
- Create: `packages/portal/src/env.d.ts`
- Create: `packages/portal/src/main.ts`
- Create: `packages/portal/src/App.vue`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@schema-form/portal",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@micro-zoe/micro-app": "1.0.0-rc.30",
    "element-plus": "^2.9.7",
    "@element-plus/icons-vue": "^2.3.2",
    "pinia": "^2.3.0",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.3",
    "typescript": "~5.7.3",
    "vite": "^6.3.2",
    "vue-tsc": "^2.2.8"
  }
}
```

- [ ] **Step 2: 创建 vite.config.ts**

```typescript
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 4: 创建 tsconfig.app.json**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "env.d.ts"]
}
```

- [ ] **Step 5: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Schema Form Platform</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: 创建 env.d.ts**

```typescript
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface Window {
  __MICRO_APP_ENVIRONMENT__?: boolean
  __MICRO_APP_BASE_ROUTE__?: string
}
```

- [ ] **Step 8: 创建 main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import microApp from '@micro-zoe/micro-app'

import App from './App.vue'
import router from './router'

// 初始化 micro-app
microApp.start()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
```

- [ ] **Step 9: 创建 App.vue**

```vue
<script setup lang="ts">
</script>

<template>
  <router-view />
</template>

<style>
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans SC", sans-serif;
  color: #1a1a2e;
  background: #f0f2f5;
  min-height: 100vh;
}
</style>
```

- [ ] **Step 10: 安装依赖并验证启动**

```bash
pnpm install
cd packages/portal && pnpm dev
# 确认 http://localhost:5175 可访问（空白页，无报错）
```

- [ ] **Step 11: Commit**

```bash
git add packages/portal/
git commit -m "feat(portal): scaffold Vue 3 project with Vite, Element Plus, micro-app"
```

---

## Task 4: Portal — API 客户端 + Auth Store

**Files:**
- Create: `packages/portal/src/utils/apiClient.ts`
- Create: `packages/portal/src/stores/auth.ts`

- [ ] **Step 1: 创建 apiClient.ts（精简版）**

```typescript
// packages/portal/src/utils/apiClient.ts

export class ApiError extends Error {
  public readonly status: number
  public readonly details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: { message: string; details?: unknown }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function getToken(): string {
  return localStorage.getItem('token') || ''
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const json = (await response.json()) as ApiResponse<T>

  if (response.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new ApiError(json.error?.message ?? 'Unauthorized', 401)
  }

  if (!json.success) {
    throw new ApiError(json.error?.message ?? 'Request failed', response.status, json.error?.details)
  }

  return json.data
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
```

- [ ] **Step 2: 创建 auth.ts store**

```typescript
// packages/portal/src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/apiClient'

interface User {
  id: string
  username: string
  displayName: string
  role: string
}

interface LoginResponse {
  token: string
  user: User
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(username: string, password: string) {
    const res = await apiClient.post<LoginResponse>('/auth/login', { username, password })
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
  }

  async function fetchMe() {
    user.value = await apiClient.get<User>('/auth/me')
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  return { token, user, isLoggedIn, isAdmin, login, fetchMe, logout }
})
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd packages/portal && npx vue-tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add packages/portal/src/utils/apiClient.ts packages/portal/src/stores/auth.ts
git commit -m "feat(portal): add API client and auth store"
```

---

## Task 5: Portal — 路由 + 导航守卫

**Files:**
- Create: `packages/portal/src/router/index.ts`

- [ ] **Step 1: 创建 router/index.ts**

```typescript
// packages/portal/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'portal',
      component: () => import('@/views/PortalView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UserManageView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/editor',
      name: 'editor-embed',
      component: () => import('@/views/EditorView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/flow',
      name: 'flow-embed',
      component: () => import('@/views/FlowView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.isLoggedIn && to.meta.requiresAuth !== false) {
    return { name: 'login' }
  }

  if (auth.isLoggedIn && to.name === 'login') {
    return { name: 'portal' }
  }

  if (auth.isLoggedIn && !auth.user) {
    try {
      await auth.fetchMe()
    } catch {
      auth.logout()
      return { name: 'login' }
    }
  }
})

export default router
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd packages/portal && npx vue-tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/portal/src/router/
git commit -m "feat(portal): add router with auth guard"
```

---

## Task 6: Portal — SubPageLayout 组件

**Files:**
- Create: `packages/portal/src/components/SubPageLayout.vue`

- [ ] **Step 1: 创建 SubPageLayout.vue**

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ArrowLeft } from '@element-plus/icons-vue'

defineProps<{
  title: string
}>()

const router = useRouter()
const auth = useAuthStore()

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="sub-page">
    <header class="sub-page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" text @click="router.push('/')">
          返回入口
        </el-button>
        <span class="page-title">{{ title }}</span>
      </div>
      <div class="header-right">
        <span class="username">{{ auth.user?.displayName }}</span>
        <el-button text @click="handleLogout">退出</el-button>
      </div>
    </header>
    <main class="sub-page-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.sub-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.sub-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  color: #666;
}

.sub-page-content {
  flex: 1;
  padding: 24px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add packages/portal/src/components/SubPageLayout.vue
git commit -m "feat(portal): add SubPageLayout component"
```

---

## Task 7: Portal — LoginView 登录页

**Files:**
- Create: `packages/portal/src/views/LoginView.vue`

- [ ] **Step 1: 创建 LoginView.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const auth = useAuthStore()

const form = ref({ username: '', password: '' })
const loading = ref(false)

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await auth.login(form.value.username, form.value.password)
    router.push('/')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">Schema Form Platform</h1>
      <p class="login-subtitle">请登录以继续</p>
      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          style="width: 100%"
          @click="handleLogin"
        >
          登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
}

.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 48px 40px;
  width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.login-title {
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 8px;
  color: #1a1a2e;
}

.login-subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 32px;
  font-size: 14px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add packages/portal/src/views/LoginView.vue
git commit -m "feat(portal): add login page"
```

---

## Task 8: Portal — PortalView 卡片入口页

**Files:**
- Create: `packages/portal/src/views/PortalView.vue`

- [ ] **Step 1: 创建 PortalView.vue**

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Odometer, Edit, Connection, User } from '@element-plus/icons-vue'

const router = useRouter()
const auth = useAuthStore()

const cards = [
  { title: '概览', desc: '系统统计数据概览', icon: Odometer, route: '/dashboard', color: '#667eea' },
  { title: '编辑器', desc: '可视化拖拽设计器，支持 30+ 组件', icon: Edit, route: '/editor', color: '#764ba2' },
  { title: '流程引擎', desc: 'BPMN 流程设计器与运行时引擎', icon: Connection, route: '/flow', color: '#f5576c' },
  { title: '用户管理', desc: '管理平台用户、角色与权限', icon: User, route: '/users', color: '#0ea5e9' },
]

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-header">
      <span class="logo">Schema Form Platform</span>
      <div class="header-right">
        <span class="username">{{ auth.user?.displayName }}</span>
        <el-button text @click="handleLogout">退出</el-button>
      </div>
    </header>

    <section class="hero">
      <h1>Schema Form Platform</h1>
      <p>Schema 驱动的可视化表单设计器与流程引擎。通过拖拽配置快速构建表单、审批流与数据接口。</p>
    </section>

    <main class="cards">
      <article
        v-for="card in cards"
        :key="card.route"
        class="card"
        @click="router.push(card.route)"
      >
        <div class="card-icon" :style="{ background: card.color }">
          <el-icon :size="24" color="#fff"><component :is="card.icon" /></el-icon>
        </div>
        <h2>{{ card.title }}</h2>
        <p>{{ card.desc }}</p>
      </article>
    </main>
  </div>
</template>

<style scoped>
.portal-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.portal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.logo {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  color: #666;
}

.hero {
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: #fff;
  text-align: center;
  padding: 80px 24px 100px;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.25) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(78, 84, 200, 0.2) 0%, transparent 40%);
  pointer-events: none;
}

.hero h1 {
  font-size: 2.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
  position: relative;
}

.hero p {
  font-size: 1.15rem;
  color: rgba(255, 255, 255, 0.72);
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.6;
  position: relative;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
  max-width: 1000px;
  margin: -60px auto 0;
  padding: 0 24px 60px;
  position: relative;
  z-index: 1;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 36px 28px 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.card h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 10px;
}

.card p {
  font-size: 0.92rem;
  color: #555;
  line-height: 1.6;
  flex: 1;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add packages/portal/src/views/PortalView.vue
git commit -m "feat(portal): add portal card entry page"
```

---

## Task 9: Portal — DashboardView 统计概览

**Files:**
- Create: `packages/portal/src/views/DashboardView.vue`

- [ ] **Step 1: 创建 DashboardView.vue**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import SubPageLayout from '@/components/SubPageLayout.vue'
import { Document, User } from '@element-plus/icons-vue'

interface Stats {
  schemas: { total: number; published: number }
  users: { total: number }
}

const stats = ref<Stats | null>(null)

onMounted(async () => {
  stats.value = await apiClient.get<Stats>('/stats')
})
</script>

<template>
  <SubPageLayout title="系统概览">
    <div class="stats-grid">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon" style="background: #667eea">
          <el-icon :size="28" color="#fff"><Document /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats?.schemas.total ?? '-' }}</div>
          <div class="stat-label">Schema 总数</div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon" style="background: #43e97b">
          <el-icon :size="28" color="#fff"><Document /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats?.schemas.published ?? '-' }}</div>
          <div class="stat-label">已发布 Schema</div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon" style="background: #0ea5e9">
          <el-icon :size="28" color="#fff"><User /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats?.users.total ?? '-' }}</div>
          <div class="stat-label">用户总数</div>
        </div>
      </el-card>
    </div>
  </SubPageLayout>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  max-width: 800px;
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 28px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add packages/portal/src/views/DashboardView.vue
git commit -m "feat(portal): add dashboard with stats cards"
```

---

## Task 10: Portal — UserManageView 用户管理

**Files:**
- Create: `packages/portal/src/views/UserManageView.vue`

- [ ] **Step 1: 创建 UserManageView.vue**

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
  role: 'admin' | 'editor' | 'viewer'
}

const users = ref<User[]>([])
const loading = ref(false)
const searchQuery = ref('')

// Dialog state
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({ username: '', password: '', displayName: '', role: 'viewer' as string })
const editingId = ref('')

// Reset password dialog
const resetPwdVisible = ref(false)
const resetPwdForm = ref({ password: '' })
const resetPwdUserId = ref('')

const roleLabels: Record<string, string> = {
  admin: '管理员',
  editor: '编辑者',
  viewer: '查看者',
}

async function fetchUsers() {
  loading.value = true
  try {
    const params = searchQuery.value ? `?q=${encodeURIComponent(searchQuery.value)}` : ''
    const res = await apiClient.get<User[]>(`/users${params}`)
    users.value = res
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = { username: '', password: '', displayName: '', role: 'viewer' }
  dialogVisible.value = true
}

function openEdit(user: User) {
  dialogMode.value = 'edit'
  editingId.value = user.id
  form.value = { username: user.username, password: '', displayName: user.displayName, role: user.role }
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
      role: form.value.role,
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

onMounted(fetchUsers)
</script>

<template>
  <SubPageLayout title="用户管理">
    <div class="user-manage">
      <div class="toolbar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名或显示名"
          :prefix-icon="Search"
          clearable
          style="width: 280px"
          @clear="fetchUsers"
          @keyup.enter="fetchUsers"
        />
        <el-button type="primary" :icon="Plus" @click="openCreate">
          新增用户
        </el-button>
      </div>

      <el-table :data="users" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="displayName" label="显示名" min-width="120" />
        <el-table-column prop="role" label="角色" min-width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'editor' ? '' : 'info'">
              {{ roleLabels[row.role] || row.role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="openEdit(row)">编辑</el-button>
            <el-button text size="small" @click="openResetPassword(row)">重置密码</el-button>
            <el-button text size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增用户' : '编辑用户'"
      width="440px"
    >
      <el-form label-width="80px">
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
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="编辑者" value="editor" />
            <el-option label="查看者" value="viewer" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Reset Password Dialog -->
    <el-dialog v-model="resetPwdVisible" title="重置密码" width="400px">
      <el-form label-width="80px">
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

<style scoped>
.user-manage {
  max-width: 960px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add packages/portal/src/views/UserManageView.vue
git commit -m "feat(portal): add user management page with CRUD and role management"
```

---

## Task 11: Portal — EditorView / FlowView micro-app 嵌入

**Files:**
- Create: `packages/portal/src/views/EditorView.vue`
- Create: `packages/portal/src/views/FlowView.vue`

- [ ] **Step 1: 创建 EditorView.vue**

```vue
<script setup lang="ts">
import SubPageLayout from '@/components/SubPageLayout.vue'
</script>

<template>
  <SubPageLayout title="表单编辑器">
    <micro-app
      name="editor"
      :url="'http://localhost:5173/editor/'"
      :data="{ token: localStorage.getItem('token') }"
      style="width: 100%; height: calc(100vh - 56px); border: none"
    />
  </SubPageLayout>
</template>
```

- [ ] **Step 2: 创建 FlowView.vue**

```vue
<script setup lang="ts">
import SubPageLayout from '@/components/SubPageLayout.vue'
</script>

<template>
  <SubPageLayout title="流程引擎">
    <micro-app
      name="flow"
      :url="'http://localhost:5174/flow/'"
      :data="{ token: localStorage.getItem('token') }"
      style="width: 100%; height: calc(100vh - 56px); border: none"
    />
  </SubPageLayout>
</template>
```

- [ ] **Step 3: 验证 portal 启动无报错**

```bash
cd packages/portal && pnpm dev
# 访问 http://localhost:5175 确认无编译错误
```

- [ ] **Step 4: Commit**

```bash
git add packages/portal/src/views/EditorView.vue packages/portal/src/views/FlowView.vue
git commit -m "feat(portal): add editor/flow embedding via micro-app"
```

---

## Task 12: 根 package.json 脚本更新

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 添加 portal 相关脚本**

在 `package.json` 的 `scripts` 中添加：

```json
"dev:portal": "pnpm --filter @schema-form/portal dev",
"dev:all": "pnpm dev:server & sleep 3 && pnpm --parallel --filter @schema-form/editor-web --filter @schema-form/flow-web --filter @schema-form/portal dev",
"build:portal": "pnpm --filter @schema-form/portal build"
```

更新 `vercel-build` 脚本，在末尾添加 portal 构建：

```json
"vercel-build": "pnpm build:server && pnpm build:editor && pnpm build:flow && pnpm build:portal && mkdir -p packages/portal/dist/editor && cp -r packages/editor/web/dist/* packages/portal/dist/editor/ && mkdir -p packages/portal/dist/flow && cp -r packages/flow/web/dist/* packages/portal/dist/flow/"
```

- [ ] **Step 2: 更新 CORS_ORIGINS 默认值**

在 `packages/server/src/app.ts` 的 CORS 配置中，将 `localhost:5175` 加入默认 origins：

```typescript
const origins = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:4173,http://127.0.0.1:5173,https://schema-form-platform.vercel.app'
```

- [ ] **Step 3: Commit**

```bash
git add package.json packages/server/src/app.ts
git commit -m "chore: add portal dev/build scripts and update CORS origins"
```

---

## Task 13: 集成验证

- [ ] **Step 1: 启动后端**

```bash
pnpm dev:server
# 确认 http://localhost:3001/api/health 返回正常
```

- [ ] **Step 2: 启动 portal**

```bash
pnpm dev:portal
# 确认 http://localhost:5175 可访问
```

- [ ] **Step 3: 测试登录流程**

1. 访问 `http://localhost:5175`，应自动跳转到 `/login`
2. 输入用户名密码登录
3. 登录成功后应跳转到卡片入口页

- [ ] **Step 4: 测试用户管理**

1. 点击「用户管理」卡片
2. 创建一个新用户
3. 编辑该用户的显示名和角色
4. 重置该用户密码
5. 删除该用户

- [ ] **Step 5: 测试仪表盘**

1. 返回入口页，点击「概览」
2. 确认统计数据正确显示

- [ ] **Step 6: 验证 TypeScript 编译**

```bash
cd packages/portal && npx vue-tsc --noEmit
```

- [ ] **Step 7: 最终 Commit（如有遗漏文件）**

```bash
git status
# 检查是否有未提交的文件
```
