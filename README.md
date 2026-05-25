# Schema Form Platform

Schema 驱动的低代码表单引擎，包含可视化编辑器和后端 API 服务。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Element Plus + Vite |
| 后端 | Koa.js + Mongoose + MongoDB |
| 部署 | Vercel (SPA + Serverless Functions) |
| 包管理 | pnpm monorepo |

## 项目结构

```
schema-form-platform/
├── packages/web/       # 前端 — 可视化编辑器 + 渲染引擎
├── packages/server/    # 后端 — REST API + 数据库
├── api/index.ts        # Vercel serverless 入口
├── vercel.json         # 部署配置
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

# 启动开发服务器（前后端并行）
pnpm dev
```

前端运行在 `http://localhost:5173`，后端运行在 `http://localhost:3001`。

## 常用命令

```bash
# 开发
pnpm dev                  # 并行启动前后端
pnpm dev:web              # 仅前端
pnpm dev:server           # 仅后端（热重载）

# 构建
pnpm build                # 构建所有包
pnpm build:web            # 仅构建前端
pnpm build:server         # 仅构建后端

# 测试
pnpm test                 # 运行所有测试
pnpm --filter @schema-form/web test -- --coverage

# 数据库
pnpm db:up                # 启动 MongoDB 容器
pnpm db:down              # 停止
pnpm db:seed              # 种子数据
```

## 环境变量

| 变量 | 用途 |
|---|---|
| `MONGODB_URI` | MongoDB 连接字符串（必需） |
| `NODE_ENV` | `development` / `production` |
| `PORT` | 服务器端口（默认 3001） |
| `CORS_ORIGINS` | 允许的跨域来源，逗号分隔 |

## 文档

- [前端文档](./packages/web/README.md)
- [后端文档](./packages/server/README.md)

## License

Private
