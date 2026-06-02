# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 沟通原则

以第一性原理思考。不假设用户意图，目标不清晰时主动讨论。遇到问题追根因，不打补丁。输出说重点，砍掉不改变决策的信息。


## 规则

### 组件嵌套唯一规则（核心架构）
所有基础组件、业务组件禁止互相嵌套、禁止互相组合搭建。  

所有组件只允许嵌套在布局组件内部，页面所有排版、结构、层级全部依赖布局组件实现。

### 样式隔离与样式架构强制规则

全局所有组件统一开启 CSS Module 样式隔离，彻底杜绝组件样式污染、全局样式冲突。  

删除所有组件硬编码样式、固定表格样式、固定宽高，所有组件样式 100% 由 Schema 配置驱动。

### 项目代码架构统一强制规则

全项目统一分层规范：  

1. 所有全局状态统一使用 Pinia Store 维护  

2. 所有公共逻辑、工具方法、业务能力统一使用 组合式 API（useXXX）  

3. 彻底废弃零散独立 utils 函数  

4. UI 组件只做渲染，不写复杂业务逻辑

### 开发质量强制规则

**禁止兜底冗余代码**：不要编写兜底、防御性冗余代码。错误应当及时暴露而非被静默吞掉，否则出错时无法定位和修复。只在系统边界（用户输入、外部 API）做必要的校验。

**组件属性配置完整性**：该项目重前端交互，每个组件都必须有对应的属性配置面板，且配置项必须能正常生效。组件的每一个可配置行为都应通过 Schema 属性驱动，不允许存在无法配置的硬编码行为。

**角色分工执行规则**：与角色相关的功能修改，必须指派对应角色的 Agent 执行：
- 架构相关（Store/Composables/工具函数）→ 前端架构师 Agent
- 组件/渲染引擎/属性面板/画布交互 → 组件工程师 Agent
- API/数据库/部署 → 服务端工程师 Agent
- 需求/体验/优先级 → 产品经理 Agent# 低代码编辑器&渲染器 完整重构最终规范文档

### 编码

- 使用兜底写法时，应该分析上下文，分析兜底写法是否是必要的

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
- **编辑器核心**: `src/widgets/` — widget 注册表 + 组件实现；`src/components/FormGrid/` — schema 驱动的渲染引擎，支持拖拽编辑
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
- `name`: String（表单名称）
- `type`: String（form | search_list）
- `status`: String（draft | published）
- `json`: Mixed — 存储 schema 树结构（`FormSchemaItem[]`）
- `publishId`: String — 发布版本的唯一标识
- `timestamps`: Date — createdAt / updatedAt

### TypeScript 配置

- 根 `tsconfig.base.json`：共享编译选项（ES2022, ESNext module, bundler resolution）
- 前端：`vue-tsc -b`（项目引用模式），`noEmit: true`（仅类型检查），使用 `tsconfig.app.json` 和 `tsconfig.node.json`
- 后端：直接 `tsc`，`noEmit: false`，输出到 `dist/`，源文件用 `.js` 导入扩展名（ESM 规范）
