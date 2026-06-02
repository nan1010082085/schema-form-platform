# Schema Form Platform

Schema 驱动的低代码表单引擎与流程引擎。可视化设计器 + 运行时渲染 + BPMN 流程编排 + AI 对话式生成，部署于 Vercel。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Element Plus + Vite 6 |
| 后端 | Koa.js + Mongoose + MongoDB |
| 流程引擎 | BPMN 2.0 + Token 执行模型 |
| AI 引擎 | OpenAI SDK + DeepSeek + 工具调用循环 |
| 微前端 | @micro-zoe/micro-app |
| 部署 | Vercel (SPA + Serverless Functions) |
| 包管理 | pnpm monorepo |

## 项目结构

```
schema-form-platform/
├── packages/
│   ├── portal/                  # 入口导航页 — Vue 3 SPA，嵌入子应用
│   ├── editor/
│   │   └── web/                 # @schema-form/editor-web — 表单编辑器 SPA
│   ├── flow/
│   │   ├── web/                 # @schema-form/flow-web — 流程设计器 SPA
│   │   └── shared/              # @schema-form/flow-shared — 共享类型与引擎工具
│   ├── ai-app/                  # @schema-form/ai-app — AI 助手微应用
│   ├── server/                  # @schema-form/server — 后端服务（API + AI Agent）
│   └── shared/                  # @schema-form/shared — 微前端基础设施 + Socket
├── api/index.ts                 # Vercel serverless 入口
├── vercel.json                  # 部署配置
├── docs/                        # 项目文档
│   ├── web.html                 # 前端编辑器文档
│   ├── flow.html                # 流程引擎文档
│   ├── ai.html                  # AI 支撑层文档
│   ├── server.html              # 后端服务文档
│   └── designs/ui/ai/           # AI UI 设计稿
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
- Portal: `http://localhost:4000`
- 编辑器: `http://localhost:5100`
- 流程引擎: `http://localhost:5200`
- AI 助手: `http://localhost:5300`
- 后端 API: `http://localhost:3001`

## 常用命令

```bash
# 开发
pnpm dev                    # 并行启动所有服务
pnpm dev:editor             # 仅编辑器前端
pnpm dev:flow               # 仅流程前端
pnpm dev:server             # 仅后端（端口 3001）

# 构建
pnpm build                  # 构建所有包
pnpm build:editor           # 构建编辑器前端
pnpm build:flow             # 构建流程前端
pnpm build:ai               # 构建 AI 助手
pnpm build:server           # 构建后端
pnpm build:portal           # 构建 Portal

# 测试
pnpm test                   # 运行所有测试

# 数据库
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
| `PORT` | 服务器端口（默认 3001） |
| `CORS_ORIGINS` | 允许的跨域来源，逗号分隔 |

## 文档

- [前端编辑器文档](./docs/web.html) — 49 Widget、事件引擎、联动系统
- [流程引擎文档](./docs/flow.html) — BPMN 设计器、Token 执行模型、审批流
- [AI 支撑层文档](./docs/ai.html) — 多智能体、工具调用循环、SSE 流式对话
- [后端服务文档](./docs/server.html) — API 路由、中间件栈、Vercel 部署

## License

Private
