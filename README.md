# Schema Form Platform

Schema 驱动的低代码表单引擎与流程引擎。可视化设计器 + 运行时渲染 + BPMN 流程编排 + AI 对话式生成。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3.5 + TypeScript 5.7 + Element Plus 2.9 + Vite 6 |
| 后端 | Koa.js + Mongoose 8 + MongoDB 7 |
| 流程引擎 | BPMN 2.0 + Token 执行模型 |
| AI 引擎 | LangChain + DeepSeek + 工具调用循环 |
| 微前端 | qiankun + @micro-zoe/micro-app |
| 部署 | 腾云轻量服务器（Ubuntu 24.04 + nginx + pm2） |
| 包管理 | pnpm 11 monorepo |

## 项目结构

```
schema-form-platform/
├── packages/
│   ├── portal/                  # 入口导航页 — Vue 3 SPA
│   ├── editor/
│   │   └── web/                 # @schema-form/editor-web — 表单编辑器 SPA（49 个 Widget）
│   ├── flow/
│   │   ├── web/                 # @schema-form/flow-web — 流程设计器 SPA
│   │   └── shared/              # @schema-form/flow-shared — BPMN 类型定义与引擎工具
│   ├── ai-app/                  # @schema-form/ai-app — AI 助手微应用
│   ├── server/                  # @schema-form/server — 后端服务（API + AI Agent）
│   └── shared/
│       └── ai/                  # @schema-form/shared-ai — AI 元数据与 prompt 构建
├── scripts/                     # 构建脚本
├── deploy/                      # 部署配置（.gitignore）
└── pnpm-workspace.yaml
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动本地 MongoDB
pnpm db:up

# 导入种子数据
pnpm db:seed

# 启动所有服务
pnpm dev
```

各服务端口：
- Portal: `http://localhost:5173`
- 编辑器: `http://localhost:5173`
- 流程引擎: `http://localhost:5173`
- AI 助手: `http://localhost:5173`
- 后端 API: `http://localhost:3001`

## 常用命令

```bash
# 开发
pnpm dev                    # 并行启动前后端
pnpm dev:editor             # 仅编辑器前端（端口 5173）
pnpm dev:flow               # 仅流程前端
pnpm dev:ai                 # 仅 AI 助手
pnpm dev:portal             # 仅 Portal
pnpm dev:server             # 仅后端（端口 3001，热重载）

# 构建
pnpm build                  # 构建所有包
pnpm build:editor           # 构建编辑器前端
pnpm build:flow             # 构建流程前端
pnpm build:ai               # 构建 AI 助手
pnpm build:portal           # 构建 Portal
pnpm build:server           # 构建后端

# 测试（vitest）
pnpm test                   # 运行所有测试
pnpm --filter @schema-form/editor-web test -- --coverage
pnpm --filter @schema-form/editor-web test -- path/to/test.spec.ts

# 数据库（本地 Docker MongoDB）
pnpm db:up                  # 启动 MongoDB 容器
pnpm db:down                # 停止
pnpm db:seed                # 种子数据
```

## 环境变量

| 变量 | 用途 |
|---|---|
| `MONGODB_URI` | MongoDB 连接字符串（必需） |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（AI 功能必需） |
| `NODE_ENV` | `development` / `production` |
| `PORT` | 服务器端口（本地 3001，线上 30001） |
| `CORS_ORIGINS` | 允许的跨域来源，逗号分隔 |
| `JWT_SECRET` | JWT 签名密钥 |

## 部署

**服务器信息**：
- IP：***REMOVED***
- 用户：ubuntu
- 端口：8828（前端）、30001（后端）

**部署流程**（本地编译，服务器装依赖）：

```bash
# 1. 本地打包（编译 TypeScript + 构建前端，产物在 deploy/output/）
bash deploy/pack.sh

# 2. 上传 + 部署（scp 上传 → 服务器安装 pnpm + 依赖 → nginx → pm2 启动）
bash deploy/deploy.sh
```

**访问地址**：
- 主页：http://***REMOVED***:8828/
- 编辑器：http://***REMOVED***:8828/editor/
- 流程：http://***REMOVED***:8828/flow/
- AI：http://***REMOVED***:8828/ai/
- API：http://***REMOVED***:8828/api/health

## 文档

- [CLAUDE.md](./CLAUDE.md) — 项目架构与开发规范
- [后端服务文档](./packages/server/README.md) — API 路由、数据模型
- [AI 支撑层文档](./packages/shared/ai/README.md) — 元数据、prompt 构建
- [编辑器文档](./packages/editor/web/README.md) — Widget 体系、渲染引擎

## License

Private
