# Portal Vue 3 项目 + 用户管理 设计文档

## 概述

将 `packages/portal/` 从静态 HTML 页面改造为 Vue 3 项目，采用卡片入口页风格，集成 micro-app 微前端嵌入 editor/flow，并新增用户管理功能。

## 目标

1. Portal 改造为 Vue 3 + Vite + Element Plus 项目
2. 保持卡片入口页风格（Hero + Cards），不做传统后台管理布局
3. 通过 micro-app 嵌入 editor 和 flow 子应用，同时保持独立可访问
4. 新增完整的用户管理（CRUD + 角色分配）
5. 新增概览仪表盘（统计卡片）

## 页面流

```
未登录 → LoginView（登录页）
登录后 → PortalView（卡片入口页）
  ├─ 点击「概览」   → DashboardView（统计卡片）
  ├─ 点击「编辑器」 → EditorView（micro-app 嵌入 editor）
  ├─ 点击「流程」   → FlowView（micro-app 嵌入 flow）
  └─ 点击「用户管理」→ UserManageView（CRUD + 角色）
```

## 布局设计

### PortalView（主入口）

保持当前静态页的 Hero + Cards 风格，增加顶部导航栏（用户名 + 退出按钮）。

```
┌─────────────────────────────────────┐
│  Logo              用户名  退出      │
├─────────────────────────────────────┤
│                                     │
│         Schema Form Platform        │
│    Schema 驱动的可视化表单设计器...    │
│                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ 概览  │  │ 编辑器 │  │ 流程  │      │
│  └──────┘  └──────┘  └──────┘      │
│         ┌──────┐                    │
│         │ 用户  │                    │
│         └──────┘                    │
└─────────────────────────────────────┘
```

### 子页面

所有子页面（Dashboard/Editor/Flow/UserManage）使用统一的 `SubPageLayout` 组件：
- 顶栏：返回入口按钮 + 页面标题 + 用户名/退出
- 内容区：子页面具体内容

不使用传统侧边栏布局。

## 目录结构

```
packages/portal/
├── src/
│   ├── views/
│   │   ├── LoginView.vue         # 登录页
│   │   ├── PortalView.vue        # 卡片入口页（主入口）
│   │   ├── DashboardView.vue     # 统计概览
│   │   ├── UserManageView.vue    # 用户 CRUD + 角色管理
│   │   ├── EditorView.vue        # micro-app 嵌入 editor
│   │   └── FlowView.vue          # micro-app 嵌入 flow
│   ├── components/
│   │   └── SubPageLayout.vue     # 子页面通用顶栏（返回 + 标题）
│   ├── stores/
│   │   └── auth.ts               # 认证状态（token、当前用户信息）
│   ├── utils/
│   │   └── apiClient.ts          # fetch 封装，复用 packages/web 的模式
│   ├── router/
│   │   └── index.ts              # 路由 + 导航守卫
│   ├── main.ts                   # micro-app 初始化 + Vue 入口
│   ├── App.vue
│   └── env.d.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 技术栈

- Vue 3 Composition API + `<script setup>` + TypeScript
- Vite 构建
- Element Plus UI 组件库
- Pinia 状态管理
- Vue Router 4
- @micro-zoe/micro-app 微前端

## 认证机制

复用现有 JWT 认证：

1. 用户在 LoginView 输入用户名密码
2. 调用 `POST /api/auth/login` 获取 token
3. token 存入 localStorage
4. apiClient 请求时自动携带 `Authorization: Bearer <token>`
5. 路由守卫：未登录跳转 `/login`，已登录访问 `/login` 跳转 `/`
6. editor/flow 嵌入时共享同一 token

## micro-app 集成

- Portal 作为 micro-app 主应用
- Editor/Flow 已配置为 micro-app 子应用（已有 bootstrap/mount/unmount 生命周期）
- Editor/Flow 保持独立可访问（standalone 模式检测 `window.__MICRO_APP_ENVIRONMENT__`）
- 子应用通过 `<micro-app>` 标签嵌入，name 分别为 `editor` 和 `flow`

## 用户管理功能

### 角色模型

复用现有 User 模型的三种角色：
- `admin`：管理员，可管理所有用户和所有功能
- `editor`：编辑者，可使用编辑器和流程功能
- `viewer`：查看者，只读权限

### 功能列表

| 功能 | 说明 |
|------|------|
| 用户列表 | 分页展示，支持按用户名/显示名搜索 |
| 创建用户 | 弹窗表单：用户名、密码、显示名、角色 |
| 编辑用户 | 弹窗表单：显示名、角色（用户名不可改） |
| 重置密码 | 弹窗确认，管理员输入新密码 |
| 删除用户 | 弹窗确认后删除 |

### 组件结构

UserManageView 使用 Element Plus 的 `el-table` + `el-dialog` 实现：
- 顶部：搜索框 + 新增按钮
- 表格：用户名、显示名、角色、创建时间、操作列
- 弹窗：创建/编辑表单

## Server 端 API 补充

### 用户管理 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/users` | 创建用户 | admin |
| PUT | `/api/users/:id` | 更新用户资料/角色 | admin |
| DELETE | `/api/users/:id` | 删除用户 | admin |
| PUT | `/api/users/:id/password` | 重置密码 | admin |

### 统计 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/stats` | 返回 Schema 总数/已发布数、用户总数 | 登录用户 |

## 构建与部署

- 独立 Vite 项目，不依赖 packages/web 的构建配置
- 开发端口：5174（web 是 5173）
- Vercel 部署：portal 作为独立 SPA，`/portal/*` 路径
- 构建输出：`packages/portal/dist/`
