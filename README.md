# Schema Form Platform

Schema 驱动的可视化表单设计器与流程编排平台。

## 项目结构

```
packages/
├── shell/         # 微前端宿主（qiankun）
├── editor/        # 可视化表单设计器（49 个 Widget）
├── flow/          # BPMN 流程设计器
├── ai/            # AI 对话式生成
├── admin/         # 系统管理
├── server/        # Koa.js 后端 + MongoDB
└── shared/        # 共享包（组件/样式/工具/配置）
```

## 快速开始

```bash
pnpm install       # 安装依赖
pnpm db:up         # 启动 MongoDB（Docker）
pnpm db:seed       # 种子数据
pnpm dev           # 启动所有服务
```

| 服务 | 地址 | 说明 |
|------|------|------|
| Shell | http://localhost:5050 | 主入口 |
| Editor | http://localhost:5100 | 表单设计器 |
| Flow | http://localhost:5200 | 流程设计器 |
| AI | http://localhost:5300 | AI 助手 |
| Admin | http://localhost:5555 | 系统管理 |
| API | http://localhost:3001 | 后端接口 |

## 常用命令

```bash
pnpm dev              # 并行启动前后端
pnpm dev:editor       # 仅编辑器
pnpm dev:server       # 仅后端（热重载）
pnpm build            # 构建所有包
pnpm test             # 运行测试
pnpm db:seed          # 种子数据
```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3.5 + TypeScript 5.7 + Element Plus 2.9 + Vite 6 |
| 微前端 | qiankun 2 |
| 后端 | Koa.js + Mongoose 8 + MongoDB 8 |
| 流程引擎 | 自研 BPMN 引擎 |
| AI | DeepSeek + 工具调用 |
| 包管理 | pnpm monorepo |

## 文档

各包文档位于 `packages/*/docs/`：

- [Shell](./packages/shell/docs/) — 微前端容器、路由
- [Editor](./packages/editor/docs/) — Widget 系统、渲染引擎
- [Flow](./packages/flow/docs/) — 流程节点、运行时
- [Server](./packages/server/docs/) — API 接口、数据模型
- [Shared](./packages/shared/docs/) — 共享组件、样式

## 部署

```bash
pnpm deploy:pack     # 本地编译打包
pnpm deploy:run      # 上传服务器 + 启动
```

服务器：`***REMOVED***`（前端 :8828 / API :30001）

## 环境变量

| 变量 | 用途 |
|------|------|
| `MONGODB_URI` | MongoDB 连接字符串 |
| `NODE_ENV` | development / production |
| `PORT` | 后端端口（本地 3001，线上 30001） |
| `JWT_SECRET` | JWT 签名密钥 |
| `CORS_ORIGINS` | 允许的跨域来源 |
