# Schema Form Platform

Schema 驱动的低代码表单引擎与流程引擎。可视化设计器 + 运行时渲染 + BPMN 流程编排 + AI 对话式生成。

## 项目简介

**Schema Form Platform** 是一个企业级 SaaS 低代码平台，核心能力包括：

- **可视化表单设计器** — 49 个 Widget，Schema 驱动，支持自由布局
- **BPMN 流程引擎** — 25 种标准节点，审批/驳回/批量/监控
- **AI 对话式生成** — 自然语言创建表单和流程
- **SSO 单点登录** — OAuth2 授权码模式，统一认证
- **SaaS Workflow** — 表单 → 审批 → 数据更新 全链路编排
- **多租户隔离** — RBAC 权限 + 数据权限 + 审计日志

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3.5 + TypeScript 5.7 + Element Plus 2.9 + Vite 6 |
| 后端 | Koa.js + Mongoose 8 + MongoDB 7 |
| 流程引擎 | BPMN 2.0 + Token 执行模型 |
| AI 引擎 | LangChain + DeepSeek + 工具调用循环 |
| 微前端 | @micro-zoe/micro-app |
| 包管理 | pnpm 11 monorepo |

## 项目结构

```
schema-form-platform/
├── packages/
│   ├── shell/                   # 主容器 — 微前端宿主 + 导航 + 登录鉴权
│   ├── portal/                  # 门户入口 — 仪表盘 + 快捷导航
│   ├── editor/
│   │   └── web/                 # 表单编辑器 — 49 个 Widget + 拖拽设计
│   ├── flow/
│   │   ├── web/                 # 流程设计器 — BPMN 可视化编排
│   │   └── shared/              # 流程共享层 — BPMN 类型定义与引擎工具
│   ├── ai-app/                  # AI 助手 — 对话式生成 + RAG 知识库
│   ├── admin/                   # 后台管理 — 用户/角色/部门/菜单/字典
│   ├── server/                  # 后端服务 — API + AI Agent + 流程引擎
│   └── shared/                  # 共享层
│       ├── config/              # 共享配置
│       ├── styles/              # 共享样式
│       ├── utils/               # 共享工具
│       ├── components/          # 共享组件
│       ├── micro-app/           # 微前端通信层
│       └── ai/                  # AI 元数据与 prompt 构建
├── scripts/                     # 构建脚本
├── deploy/                      # 部署配置
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

## 常用命令

```bash
# 开发
pnpm dev                    # 并行启动前后端
pnpm dev:editor             # 仅编辑器前端
pnpm dev:flow               # 仅流程前端
pnpm dev:ai                 # 仅 AI 助手
pnpm dev:portal             # 仅 Portal
pnpm dev:shell              # 仅 Shell 容器
pnpm dev:admin              # 仅后台管理
pnpm dev:server             # 仅后端（热重载）

# 构建
pnpm build                  # 构建所有包
pnpm build:editor           # 构建编辑器前端
pnpm build:server           # 构建后端

# 测试
pnpm test                   # 运行所有测试

# 数据库
pnpm db:up                  # 启动 MongoDB 容器
pnpm db:down                # 停止
pnpm db:seed                # 种子数据
```

## 功能模块

### 表单编辑器 (Editor)
- 49 个 Widget（表单/表格/图表/布局/业务组件）
- 拖拽式设计 + 属性配置面板
- 事件引擎（14 种动作类型）
- 变量系统 + 数据源配置
- 模板系统 + 版本管理

### 流程引擎 (Flow)
- BPMN 2.0 标准节点（25 种）
- 可视化流程设计器
- 审批任务收件箱（待办/已办/委派）
- 流程监控 + 统计仪表盘
- 驳回/挂起/恢复/批量审批

### AI 助手 (AI App)
- 对话式 Schema/Flow 生成
- 多 Agent 路由（编辑器/流程/页面专家）
- RAG 知识库 + 向量检索
- SSE 流式对话
- HITL 中断恢复

### 后台管理 (Admin)
- 用户管理 + 角色管理
- 部门管理 + 岗位管理
- 菜单管理 + 字典管理
- 操作日志 + 参数设置

### SaaS Workflow
- 三步编排（表单 → 流程 → 数据更新规则）
- 表单提交自动触发流程
- 审批表单数据回填
- 审批完成自动数据更新
- 模板库 + 进度跟踪

### 扩展能力
- SSO 单点登录（OAuth2 授权码模式）
- API Key 认证
- Webhook 回调系统
- 多租户隔离 + RBAC 权限
- 数据导出（CSV/Excel）

## 环境变量

| 变量 | 用途 |
|---|---|
| `MONGODB_URI` | MongoDB 连接字符串（必需） |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（AI 功能必需） |
| `NODE_ENV` | `development` / `production` |
| `PORT` | 服务器端口 |
| `CORS_ORIGINS` | 允许的跨域来源，逗号分隔 |
| `JWT_SECRET` | JWT 签名密钥 |

## 文档

- [CLAUDE.md](./CLAUDE.md) — 项目架构与开发规范
- [SSO 设计方案](./docs/sso-design.md) — 单点登录架构设计
- [SaaS Workflow 方案](./docs/saas-workflow-design.md) — 工作流产品方案
- [SaaS 扩展能力](./docs/saas-extension-capabilities.md) — 扩展能力分析
- [竞品分析](./docs/competitive-analysis.md) — Dify/N8n 对标分析

## License

Private
