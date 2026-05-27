# Monorepo 架构迁移计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 monorepo 从单一 SPA 架构拆分为三个独立 SPA（portal + editor + flow），每个子项目前后完整，共享后端。

**Architecture:** Portal 作为 Vercel 根入口导航页；Editor 和 Flow 各自独立 SPA，拥有完整路由/登录/布局；Server 按职责拆分为共享服务 + 编辑器专属服务。

**Tech Stack:** Vue 3, Vite 6, Koa.js, MongoDB, Vercel Serverless

---

## 目标文件结构

```
schema-form-platform/
├── packages/
│   ├── portal/                  # SPA 1 — 入口导航页（静态 HTML）
│   ├── editor/
│   │   ├── web/                 # SPA 2 — 表单编辑器（原 packages/web）
│   │   └── server/              # 编辑器后端（Schema CRUD、mock、docs）
│   ├── flow/
│   │   ├── web/                 # SPA 3 — 流程引擎（完整 SPA）
│   │   ├── shared/              # 共享类型（不变）
│   │   └── server/              # 流程后端（不变）
│   └── server/                  # 共享后端（auth、health、data、dict、options）
├── api/index.ts                 # Vercel serverless 入口（更新引用）
├── vercel.json                  # 路由配置（更新）
└── pnpm-workspace.yaml          # 工作区（更新）
```

---

## Task 1: 创建 Portal 入口导航页

Portal 是一个静态 HTML 页面，不需要构建步骤。直接输出到 `packages/portal/dist/`。

**Files:**
- Create: `packages/portal/index.html`

- [ ] **Step 1: 创建 portal 目录和入口 HTML**

```bash
mkdir -p /Users/yangdongnan/work/schema-form-platform/packages/portal
```

创建 `packages/portal/index.html`，内容为项目导航页（项目卡片 + 跳转链接）。页面应包含：
- 标题 "Schema Form Platform"
- 三个项目卡片：表单编辑器（→ /editor/）、流程引擎（→ /flow/）、API 文档（→ /api/docs）
- 响应式布局，内联 CSS，无外部依赖

- [ ] **Step 2: 验证页面可直接在浏览器打开**

用浏览器打开 `packages/portal/index.html`，确认三个卡片正确显示和跳转。

- [ ] **Step 3: Commit**

```bash
git add packages/portal/
git commit -m "feat: add portal entry page"
```

---

## Task 2: 迁移 packages/web → packages/editor/web

**Files:**
- Move: `packages/web/*` → `packages/editor/web/*`
- Modify: `packages/editor/web/package.json` (更新包名和依赖)
- Modify: `packages/editor/web/vite.config.ts` (更新路径别名)
- Modify: `packages/editor/web/vite.widget.config.ts` (如果存在)
- Modify: `packages/editor/web/vite.microapp.config.ts` (如果存在)

- [ ] **Step 1: 创建 editor 目录并移动文件**

```bash
mkdir -p /Users/yangdongnan/work/schema-form-platform/packages/editor
mv /Users/yangdongnan/work/schema-form-platform/packages/web /Users/yangdongnan/work/schema-form-platform/packages/editor/web
```

- [ ] **Step 2: 更新 package.json 包名**

将 `packages/editor/web/package.json` 中的 `"name": "@schema-form/web"` 改为 `"name": "@schema-form/editor-web"`。

移除对 `@schema-form/flow-web` 的依赖（编辑器不再直接依赖流程前端）：
```json
// 删除这一行
"@schema-form/flow-web": "workspace:*",
```

- [ ] **Step 3: 更新路由 — 移除非编辑器页面**

编辑 `packages/editor/web/src/router/index.ts`：

删除以下路由：
- `/login` (LoginView)
- `/instances` (InstancesView)
- `/flows` (FlowListView)
- `/tasks` (TaskInboxView)
- `/flow-instance/:id` (FlowInstanceDetailView)
- `/flow-designer` (动态导入 flow-web)
- `/docs` (DocsIndexView)
- `/docs/:componentId` (ComponentDocPage)

删除 AppLayout 包裹的整个 children 路由块。

保留以下路由：
- `/editor` → EditorView
- `/preview` → PreviewRenderView
- `/view` → PublishView
- `/` → redirect to `/editor`
- `/:pathMatch(.*)*` → NotFoundView

保留编辑器未保存拦截守卫。移除认证守卫（编辑器不需要独立登录）。

- [ ] **Step 4: 移除不属于编辑器的视图文件**

```bash
rm packages/editor/web/src/views/LoginView.vue
rm packages/editor/web/src/views/InstancesView.vue
rm packages/editor/web/src/views/FlowListView.vue
rm packages/editor/web/src/views/TaskInboxView.vue
rm packages/editor/web/src/views/FlowInstanceDetailView.vue
rm packages/editor/web/src/views/DocsIndexView.vue
rm -rf packages/editor/web/src/views/docs/
```

- [ ] **Step 5: 移除不属于编辑器的组件和 Store**

```bash
rm packages/editor/web/src/components/AppLayout.vue
rm packages/editor/web/src/stores/auth.ts
```

检查 `packages/editor/web/src/stores/app.ts`，如果其中包含 qiankun 注入的全局上下文逻辑（非编辑器需要），保留必要的部分。

- [ ] **Step 6: 更新 vite.config.ts**

编辑 `packages/editor/web/vite.config.ts`，移除 qiankun 插件（编辑器作为独立 SPA，不再做 qiankun 子应用）：

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
```

- [ ] **Step 7: 更新 App.vue — 移除 qiankun 生命周期**

检查 `packages/editor/web/src/App.vue`，移除 `renderWithQiankun`、`qiankunWindow` 等 qiankun 相关代码，改为普通 Vue 应用启动。

- [ ] **Step 8: 更新 main.ts — 移除 qiankun 注册**

检查 `packages/editor/web/src/main.ts`，移除 qiankun 相关的 `renderWithQiankun` 和生命周期钩子，改为标准 Vue app 创建和挂载。

- [ ] **Step 9: 验证编辑器可独立运行**

```bash
cd packages/editor/web && pnpm dev
```

确认：编辑器页面可访问，拖拽/属性面板/保存功能正常。

- [ ] **Step 10: Commit**

```bash
git add packages/editor/ packages/web/
git commit -m "refactor: move packages/web → packages/editor/web, remove non-editor routes"
```

---

## Task 3: 拆分 Server — 创建 editor/server

**Files:**
- Create: `packages/editor/server/` (新目录)
- Create: `packages/editor/server/package.json`
- Create: `packages/editor/server/tsconfig.json`
- Create: `packages/editor/server/src/app.ts` (编辑器专属 Koa app)
- Create: `packages/editor/server/src/index.ts` (本地开发入口)
- Move: `packages/server/src/routes/schema.ts` → `packages/editor/server/src/routes/schema.ts`
- Move: `packages/server/src/routes/mock.ts` → `packages/editor/server/src/routes/mock.ts`
- Move: `packages/editor/server/src/routes/docs.ts` → `packages/editor/server/src/routes/docs.ts`
- Move: `packages/server/src/routes/users.ts` → `packages/editor/server/src/routes/users.ts`
- Copy: `packages/server/src/models/FormSchema.ts` → `packages/editor/server/src/models/FormSchema.ts`
- Copy: `packages/server/src/models/PublishedSchema.ts` → `packages/editor/server/src/models/PublishedSchema.ts`
- Copy: `packages/server/src/middleware/errorHandler.ts` → `packages/editor/server/src/middleware/errorHandler.ts`
- Copy: `packages/server/src/middleware/rateLimit.ts` → `packages/editor/server/src/middleware/rateLimit.ts`
- Copy: `packages/server/src/config/database.ts` → `packages/editor/server/src/config/database.ts`

- [ ] **Step 1: 创建 editor/server 目录结构**

```bash
mkdir -p packages/editor/server/src/{routes,models,middleware,config,schemas}
```

- [ ] **Step 2: 创建 package.json**

```json
{
  "name": "@schema-form/editor-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "author": "yangdongnan",
  "description": "编辑器后端 — Schema CRUD、Mock 数据、组件文档 API",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@koa/cors": "^5.0.0",
    "@koa/router": "^13.1.0",
    "bcryptjs": "^3.0.3",
    "jsonwebtoken": "^9.0.3",
    "koa": "^2.15.4",
    "koa-bodyparser": "^4.4.1",
    "koa-helmet": "^9.0.0",
    "koa-ratelimit": "^6.0.0",
    "mongoose": "^8.9.0",
    "uuid": "^11.1.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/koa": "^2.15.0",
    "@types/koa-bodyparser": "^4.3.13",
    "@types/koa-ratelimit": "^5.0.5",
    "@types/koa__cors": "^5.0.0",
    "@types/koa__router": "^12.0.4",
    "@types/node": "^22.13.0",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.0",
    "typescript": "~5.7.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 3: 复制数据库配置和中间件**

```bash
cp packages/server/src/config/database.ts packages/editor/server/src/config/database.ts
cp packages/server/src/middleware/errorHandler.ts packages/editor/server/src/middleware/errorHandler.ts
cp packages/server/src/middleware/rateLimit.ts packages/editor/server/src/middleware/rateLimit.ts
```

- [ ] **Step 4: 复制 Schema 相关模型**

```bash
cp packages/server/src/models/FormSchema.ts packages/editor/server/src/models/FormSchema.ts
cp packages/server/src/models/PublishedSchema.ts packages/editor/server/src/models/PublishedSchema.ts
```

- [ ] **Step 5: 复制 Schema 相关路由**

```bash
cp packages/server/src/routes/schema.ts packages/editor/server/src/routes/schema.ts
cp packages/server/src/routes/mock.ts packages/editor/server/src/routes/mock.ts
cp packages/server/src/routes/docs.ts packages/editor/server/src/routes/docs.ts
cp packages/server/src/routes/users.ts packages/editor/server/src/routes/users.ts
```

检查这些路由文件的 import 路径，更新为本地相对路径（如 `../models/FormSchema.js`、`../middleware/auth.js`）。

- [ ] **Step 6: 创建编辑器专属 Koa app**

创建 `packages/editor/server/src/app.ts`：

```ts
import Koa from 'koa'
import cors from '@koa/cors'
import helmet from 'koa-helmet'
import bodyParser from 'koa-bodyparser'
import { errorHandler } from './middleware/errorHandler.js'
import { createRateLimit } from './middleware/rateLimit.js'
import schemaRouter from './routes/schema.js'
import mockRouter from './routes/mock.js'
import docsRouter from './routes/docs.js'
import usersRouter from './routes/users.js'

const app = new Koa()

app.use(errorHandler)
app.use(helmet({ contentSecurityPolicy: false }))
app.use(bodyParser())
app.use(cors({
  origin: (ctx) => {
    const origins = process.env.CORS_ORIGINS || 'http://localhost:5174,http://localhost:4173,https://schema-form-platform.vercel.app'
    if (origins === '*') return ctx.get('Origin')
    const allowed = origins.split(',').map((s) => s.trim())
    const requestOrigin = ctx.get('Origin')
    return allowed.includes(requestOrigin) ? requestOrigin : ''
  },
  credentials: true,
}))
app.use(createRateLimit())

app.use(docsRouter.routes())
app.use(docsRouter.allowedMethods())
app.use(schemaRouter.routes())
app.use(schemaRouter.allowedMethods())
app.use(mockRouter.routes())
app.use(mockRouter.allowedMethods())
app.use(usersRouter.routes())
app.use(usersRouter.allowedMethods())

export default app
```

- [ ] **Step 7: 创建本地开发入口**

创建 `packages/editor/server/src/index.ts`：

```ts
import app from './app.js'

const PORT = process.env.PORT || 3002

app.listen(PORT, () => {
  console.log(`[editor-server] running on http://localhost:${PORT}`)
})
```

- [ ] **Step 8: 创建 tsconfig.json**

创建 `packages/editor/server/tsconfig.json`，参考 `packages/server/tsconfig.json` 的配置。

- [ ] **Step 9: 验证编辑器后端可独立运行**

```bash
cd packages/editor/server && pnpm dev
curl http://localhost:3002/api/schemas
```

- [ ] **Step 10: Commit**

```bash
git add packages/editor/server/
git commit -m "feat: add editor-server with schema, mock, docs, users routes"
```

---

## Task 4: 清理共享 Server — 仅保留公共路由

**Files:**
- Modify: `packages/server/src/app.ts` (移除编辑器和流程路由)
- Delete: `packages/server/src/routes/schema.ts` (已移到 editor/server)
- Delete: `packages/server/src/routes/mock.ts` (已移到 editor/server)
- Delete: `packages/server/src/routes/docs.ts` (已移到 editor/server)
- Delete: `packages/server/src/routes/users.ts` (已移到 editor/server)
- Keep: `packages/server/src/routes/auth.ts`
- Keep: `packages/server/src/routes/health.ts`
- Keep: `packages/server/src/routes/data.ts`
- Keep: `packages/server/src/routes/dict.ts`
- Keep: `packages/server/src/routes/options.ts`
- Keep: `packages/server/src/flow-routes/*` (流程路由委托给 flow-server)

- [ ] **Step 1: 更新 app.ts — 移除已迁移的路由**

编辑 `packages/server/src/app.ts`，移除以下 import 和路由注册：
- `schemaRouter` → 已移到 editor/server
- `mockRouter` → 已移到 editor/server
- `docsRouter` → 已移到 editor/server
- `usersRouter` → 已移到 editor/server

保留以下路由：
- `healthRouter` — 健康检查
- `authRouter` — 认证（共享）
- `dictRouter` — 字典查询（共享）
- `optionsRouter` — 选项配置（共享）
- `dataRouter` — 数据查询（共享）
- 所有 `flowRouter*` — 流程路由（委托给 flow-server）

- [ ] **Step 2: 删除已迁移的路由文件**

```bash
rm packages/server/src/routes/schema.ts
rm packages/server/src/routes/mock.ts
rm packages/server/src/routes/docs.ts
rm packages/server/src/routes/users.ts
```

注意：不要删除 `packages/server/src/models/` 下的文件，因为共享 server 可能仍被 flow-server 间接依赖。

- [ ] **Step 3: 验证共享后端可独立运行**

```bash
cd packages/server && pnpm dev
curl http://localhost:3001/api/health
curl http://localhost:3001/api/auth/me
```

- [ ] **Step 4: Commit**

```bash
git add packages/server/
git commit -m "refactor: remove migrated routes from shared server, keep auth/health/data/dict/options"
```

---

## Task 5: 补全 Flow Web — 改造为完整 SPA

当前 `packages/flow/web` 是一个组件库。需要添加 SPA 基础设施（index.html、main.ts、App.vue、router）并吸收从 editor/web 移出的流程视图。

**Files:**
- Create: `packages/flow/web/index.html`
- Create: `packages/flow/web/src/main.ts` (SPA 入口)
- Create: `packages/flow/web/src/App.vue`
- Create: `packages/flow/web/src/router/index.ts`
- Create: `packages/flow/web/src/views/FlowListView.vue` (从 editor/web 移入)
- Create: `packages/flow/web/src/views/TaskInboxView.vue` (从 editor/web 移入)
- Create: `packages/flow/web/src/views/FlowInstanceDetailView.vue` (从 editor/web 移入)
- Create: `packages/flow/web/src/views/LoginView.vue` (新建)
- Create: `packages/flow/web/src/views/NotFoundView.vue` (新建)
- Create: `packages/flow/web/src/components/AppLayout.vue` (新建)
- Create: `packages/flow/web/src/stores/auth.ts` (新建)
- Modify: `packages/flow/web/package.json` (添加 SPA 依赖和脚本)
- Create: `packages/flow/web/vite.config.ts`

- [ ] **Step 1: 更新 package.json — 添加 SPA 依赖**

编辑 `packages/flow/web/package.json`：

```json
{
  "name": "@schema-form/flow-web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "author": "yangdongnan",
  "description": "流程引擎前端 — BPMN 流程设计器、流程管理、任务收件箱",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@element-plus/icons-vue": "^2.3.2",
    "@schema-form/flow-shared": "workspace:*",
    "@vue-flow/background": "^1.3.2",
    "@vue-flow/controls": "^1.1.3",
    "@vue-flow/core": "^1.48.2",
    "@vue-flow/minimap": "^1.5.4",
    "element-plus": "^2.9.7",
    "pinia": "^2.3.0",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.3",
    "typescript": "~5.7.3",
    "vite": "^6.3.0",
    "vitest": "^3.2.4",
    "vue-tsc": "^2.2.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.ts**

创建 `packages/flow/web/vite.config.ts`：

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
```

- [ ] **Step 3: 创建 index.html**

创建 `packages/flow/web/index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>流程引擎</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 4: 创建 main.ts**

创建 `packages/flow/web/src/main.ts`：

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

- [ ] **Step 5: 创建 App.vue**

创建 `packages/flow/web/src/App.vue`：

```vue
<script setup lang="ts">
</script>

<template>
  <router-view />
</template>
```

- [ ] **Step 6: 创建路由**

创建 `packages/flow/web/src/router/index.ts`：

```ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/flow/'),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        { path: '', redirect: '/list' },
        {
          path: 'list',
          name: 'flow-list',
          component: () => import('@/views/FlowListView.vue'),
        },
        {
          path: 'tasks',
          name: 'task-inbox',
          component: () => import('@/views/TaskInboxView.vue'),
        },
        {
          path: 'instance/:id',
          name: 'flow-instance-detail',
          component: () => import('@/views/FlowInstanceDetailView.vue'),
          props: true,
        },
      ],
    },
    {
      path: '/designer',
      name: 'flow-designer',
      component: () => import('@/components/FlowDesigner.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  if (import.meta.env.DEV) return true
  // TODO: 添加认证检查
  return true
})

export default router
```

- [ ] **Step 7: 创建 AppLayout**

从 `packages/editor/web/src/components/AppLayout.vue` 复制并修改，导航项改为：
- 流程列表 (`/list`)
- 我的任务 (`/tasks`)
- 设置（保留占位）

- [ ] **Step 8: 创建 LoginView 和 NotFoundView**

从 `packages/editor/web/src/views/LoginView.vue` 和 `NotFoundView.vue` 复制并调整。

- [ ] **Step 9: 移入流程视图**

将以下文件从 `packages/editor/web/src/views/` 复制到 `packages/flow/web/src/views/`：
- `FlowListView.vue`
- `TaskInboxView.vue`
- `FlowInstanceDetailView.vue`

检查这些视图的 import 路径，确保引用的是 `@schema-form/flow-web` 的 store（`useFlowDefinitionStore`、`useFlowInstanceStore`）。

- [ ] **Step 10: 创建 auth store**

创建 `packages/flow/web/src/stores/auth.ts`，参考 `packages/editor/web/src/stores/auth.ts` 的实现。

- [ ] **Step 11: 验证流程前端可独立运行**

```bash
cd packages/flow/web && pnpm dev
```

确认：流程列表、任务收件箱、流程设计器页面可访问。

- [ ] **Step 12: Commit**

```bash
git add packages/flow/web/
git commit -m "feat: convert flow-web to complete SPA with router, layout, auth"
```

---

## Task 6: 更新 Workspace 配置

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json` (根)

- [ ] **Step 1: 更新 pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
  - 'packages/editor/*'
  - 'packages/flow/*'
onlyBuiltDependencies:
  - esbuild
  - vue-demi
  - '@parcel/watcher'
```

- [ ] **Step 2: 更新根 package.json scripts**

```json
{
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "dev:portal": "pnpm --filter @schema-form/portal dev",
    "dev:editor": "pnpm --filter @schema-form/editor-web dev",
    "dev:editor-server": "pnpm --filter @schema-form/editor-server dev",
    "dev:server": "pnpm --filter @schema-form/server dev",
    "dev:flow": "pnpm --filter @schema-form/flow-web dev",
    "build": "pnpm -r build",
    "build:portal": "pnpm --filter @schema-form/portal build",
    "build:editor": "pnpm --filter @schema-form/editor-web build",
    "build:editor-server": "pnpm --filter @schema-form/editor-server build",
    "build:server": "pnpm --filter @schema-form/server build",
    "build:flow": "pnpm --filter @schema-form/flow-web build",
    "db:up": "pnpm --filter @schema-form/server db:up",
    "db:down": "pnpm --filter @schema-form/server db:down",
    "format": "pnpm -r format",
    "clean": "pnpm -r exec -- rm -rf node_modules dist .turbo"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore: update workspace config for new package structure"
```

---

## Task 7: 更新 Vercel 部署配置

**Files:**
- Modify: `vercel.json`
- Modify: `api/index.ts`

- [ ] **Step 1: 更新 vercel.json**

```json
{
  "buildCommand": "pnpm build:server && pnpm build:editor && pnpm build:flow",
  "installCommand": "pnpm install --frozen-lockfile",
  "outputDirectory": "packages/portal",
  "functions": {
    "api/index.ts": {
      "memory": 512,
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/editor/assets/(.*)", "destination": "/editor/assets/$1" },
    { "source": "/editor/(.*)", "destination": "/editor/index.html" },
    { "source": "/flow/assets/(.*)", "destination": "/flow/assets/$1" },
    { "source": "/flow/(.*)", "destination": "/flow/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(editor|flow)/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "crons": [
    { "path": "/api/flow-timers/check", "schedule": "* * * * *" }
  ]
}
```

- [ ] **Step 2: 更新 api/index.ts — 合并所有 server**

```ts
import editorApp from '../packages/editor/server/dist/app.js'
import sharedApp from '../packages/server/dist/handler.js'
import { connectDatabase, mongoose } from '../packages/server/dist/config/database.js'

let dbReady = false

export default async function handler(req: any, res: any) {
  if (!dbReady) {
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

  if (mongoose.connection.readyState !== 1) {
    dbReady = false
    try {
      await connectDatabase()
      dbReady = true
    } catch (err) {
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: false, error: { message: 'Database connection lost' } }))
      return
    }
  }

  // Editor API routes: /api/schemas/*, /api/mock, /api/docs, /api/users
  if (req.url?.startsWith('/api/schemas') || req.url?.startsWith('/api/mock') || req.url?.startsWith('/api/docs') || req.url?.startsWith('/api/users')) {
    return editorApp.callback()(req, res)
  }

  // Shared API routes: /api/auth/*, /api/health, /api/data, /api/dict, /api/options, /api/flows/*
  sharedApp(req, res)
}
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json api/index.ts
git commit -m "chore: update Vercel config for multi-SPA deployment"
```

---

## Task 8: 全量构建验证

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/yangdongnan/work/schema-form-platform
pnpm install
```

- [ ] **Step 2: 构建所有包**

```bash
pnpm build
```

确认无构建错误。

- [ ] **Step 3: 运行测试**

```bash
pnpm test
```

确认所有测试通过。

- [ ] **Step 4: 验证各 SPA 可独立运行**

```bash
# Portal — 直接浏览器打开 packages/portal/index.html

# Editor
cd packages/editor/web && pnpm dev
# 访问 http://localhost:5173/editor

# Flow
cd packages/flow/web && pnpm dev
# 访问 http://localhost:5174/flow/list

# 共享 Server
cd packages/server && pnpm dev
# 访问 http://localhost:3001/api/health

# 编辑器 Server
cd packages/editor/server && pnpm dev
# 访问 http://localhost:3002/api/schemas
```

- [ ] **Step 5: Final Commit**

```bash
git add -A
git commit -m "chore: verify full build and tests pass after migration"
```
