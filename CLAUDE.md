# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 沟通原则

以第一性原理思考。不假设用户意图，目标不清晰时主动讨论。遇到问题追根因，不打补丁。输出说重点，砍掉不改变决策的信息。

## 项目概览

pnpm monorepo：schema-driven form engine，包含可视化编辑器和后端 API 服务。部署于 Vercel（SPA + Serverless Functions）。

```
schema-form-platform/
├── packages/web/       # @schema-form/web — Vue 3 + Vite + Element Plus
├── packages/server/    # @schema-form/server — Koa.js + MongoDB (Mongoose)
├── api/index.ts        # Vercel serverless entry → packages/server/dist/handler.js
├── vercel.json         # Vercel deploy config（双构建：server → web）
└── pnpm-workspace.yaml
```

## 常用命令

```bash
# 开发
pnpm dev                  # 并行启动前后端
pnpm dev:web              # 仅前端（端口 5173）
pnpm dev:server           # 仅后端（端口 3001，tsx watch 热重载）

# 构建
pnpm build                # 构建所有包
pnpm build:server         # tsc 编译后端到 packages/server/dist/
pnpm build:web            # vue-tsc + vite build → packages/web/dist/

# 测试（vitest）
pnpm test                 # 运行所有测试
pnpm --filter @schema-form/web test -- --coverage
pnpm --filter @schema-form/web test -- path/to/test.spec.ts  # 单个测试

# 数据库（本地 Docker MongoDB）
pnpm db:up                # 启动 MongoDB 容器
pnpm db:down              # 停止
pnpm db:seed              # 种子数据
```

## 架构

### 前端 (`packages/web`)

- **框架**: Vue 3 Composition API + `<script setup>` + TypeScript
- **UI**: Element Plus 2.9
- **状态管理**: Pinia（`useSchemaStore` — schema CRUD；`useEditorStore` — 编辑器画布状态、撤销/重做）
- **路由**: Vue Router 4，支持 qiankun 微前端模式（`/child/schemaForm/` 前缀）
- **API 通信**: `src/utils/apiClient.ts` — 基于 fetch 的薄封装，`ApiError` 统一错误类型。通过 `configureApiClient()` 初始化 baseUrl 和 token
- **编辑器核心**: `src/components/FormGrid/` — schema 驱动的表单组件系统，支持拖拽编辑
- **路径别名**: `@/` → `src/`

### 后端 (`packages/server`)

- **框架**: Koa.js，ESM 模块（`"type": "module"`）
- **数据库**: MongoDB Atlas（生产）/ Docker MongoDB 8（本地），Mongoose ODM
- **认证**: JWT + bcryptjs（User 模型已就位，路由待实施）
- **API 路由**:
  - `GET/POST /api/schemas` — 列表（分页+搜索+筛选）和创建
  - `GET/PUT/DELETE /api/schemas/:id` — 单个 CRUD，ID 使用 UUID
  - `GET /api/health` — 健康检查（含 DB ping）
- **中间件栈**: errorHandler → helmet → bodyParser → CORS → routes
- **CORS**: 通过 `CORS_ORIGINS` 环境变量控制，逗号分隔

### Vercel 部署

- `vercel.json` 的 `buildCommand` 先编译后端 TypeScript，再构建前端
- `api/index.ts` 是 serverless 入口，重新导出 `packages/server/dist/handler.js`
- handler 管理 MongoDB 连接生命周期（惰性连接、重连、503 降级）
- 路由：`/api/*` → serverless function，其他 → SPA（`index.html`）

### 环境变量

| 变量 | 用途 |
|---|---|
| `MONGODB_URI` | MongoDB 连接字符串（必需） |
| `NODE_ENV` | `development` / `production` |
| `PORT` | 服务器端口（默认 3001） |
| `CORS_ORIGINS` | 允许的跨域来源，逗号分隔 |

### 数据模型

**FormSchema** — 核心资源：
- `_id`: UUID string（非 ObjectId）
- `name`, `type`（form | search_list）, `status`（draft | published）
- `json`: Mixed — 存储 schema 树结构（`FormSchemaItem[]`）
- `publishId`: 发布版本的唯一标识
- `timestamps`: createdAt / updatedAt

### TypeScript 配置

- 根 `tsconfig.base.json`：共享编译选项（ES2022, ESNext module, bundler resolution）
- 前端：`vue-tsc -b`（项目引用模式），`noEmit: true`（仅类型检查），使用 `tsconfig.app.json` 和 `tsconfig.node.json`
- 后端：直接 `tsc`，`noEmit: false`，输出到 `dist/`，源文件用 `.js` 导入扩展名（ESM 规范）
