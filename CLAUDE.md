# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
2. 所有公共逻辑、工具方法、业务能力统一使用组合式 API（useXXX）
3. 彻底废弃零散独立 utils 函数
4. UI 组件只做渲染，不写复杂业务逻辑
5. 每个项目的 API 接口必须聚合到 `src/api/` 目录下统一定义（如 `authApi.ts`、`menuApi.ts`），组件/stores/composables 禁止直接调用 `fetch()` 或 `apiClient`，只能 import `src/api/` 下导出的函数。标杆：`platform/ai/app/src/api/aiApi.ts`

### 开发质量强制规则

**禁止兜底冗余代码**：不要编写兜底、防御性冗冗余代码。错误应当及时暴露而非被静默吞掉，否则出错时无法定位和修复。只在系统边界（用户输入、外部 API）做必要的校验。

**组件属性配置完整性**：该项目重前端交互，每个组件都必须有对应的属性配置面板，且配置项必须能正常生效。组件的每一个可配置行为都应通过 Schema 属性驱动，不允许存在无法配置的硬编码行为。

**角色分工执行规则**：与角色相关的功能修改，必须指派对应角色的 Agent 执行：
- 架构相关（Store/Composables/工具函数）→ 前端架构师 Agent
- 组件/渲染引擎/属性面板/画布交互 → 组件工程师 Agent
- API/数据库/部署 → 服务端工程师 Agent
- 需求/体验/优先级 → 产品经理 Agent

### 编码

- 使用兜底写法时，应该分析上下文，分析兜底写法是否是必要的

## 项目概览

pnpm monorepo：Schema 驱动的可视化自由布局设计器与渲染器。三层架构：业务层（business）→ 能力层（platform）→ 共享层（shared）。

**开发环境**：本地 Docker（MongoDB 8）
**部署环境**：腾讯云轻量服务器（Ubuntu 24.04 + Docker MongoDB + nginx）

```
schema-form-platform/
├── business/                    # ═══ 业务层 ═══
│   ├── shell/                   #   @schema-form/shell — 主宿主应用
│   ├── admin/                   #   @schema-form/admin — 系统管理
│   └── shared/                  #   @schema-form/business-shared — 业务公共组件
│
├── platform/                    # ═══ 能力层 ═══
│   ├── editor/                  #   @schema-form/editor-web — 表单设计器
│   ├── flow/                    #   BPMN 流程引擎
│   │   ├── web/                 #     @schema-form/flow-web — 流程设计器前端
│   │   └── shared/              #     @schema-form/flow-shared — 流程引擎核心
│   ├── ai/                      #   AI 助手
│   │   ├── app/                 #     @schema-form/ai-app — AI 前端
│   │   ├── sdk/                 #     @schema-form/ai-sdk — Agent SDK
│   │   └── shared/              #     @schema-form/ai-shared — AI 共享类型
│   ├── server/                  #   @schema-form/server — 后端 API
│   └── shared/                  #   @schema-form/platform-shared — 能力层公共
│
├── shared/                      # 旧 shared（已迁移至 platform/business，待清理）
├── deploy/                      # 部署配置
└── pnpm-workspace.yaml
```

### 依赖方向（严格单向）

```
business → platform → shared
  ↓           ↓
shell      editor / flow / ai / server
admin
```

禁止：shared 反向依赖 platform 或 business。

### 共享包归属

| 包 | 位置 | 用途 |
|---|---|---|
| `@schema-form/platform-shared` | `platform/shared/` | AppDialog、AppIcon、apiClient、qiankun、socket、config |
| `@schema-form/business-shared` | `business/shared/` | UserDropdown、LayoutSwitcher、useLayoutStore、authTypes |
| `@schema-form/flow-shared` | `platform/flow/shared/` | BPMN 引擎 + 类型 |
| `@schema-form/ai-shared` | `platform/ai/shared/` | AI 元数据 + promptBuilder |

## 常用命令

```bash
# 开发
pnpm dev                  # 并行启动前后端
pnpm dev:editor           # 仅编辑器前端（端口 5173）
pnpm dev:server           # 仅后端（端口 3001，tsx watch 热重载）

# 构建
pnpm build                # 构建所有包
pnpm build:server         # tsc 编译后端
pnpm build:editor         # vite build 编辑器前端
pnpm build:shell          # 构建 shell 主宿主

# 测试（vitest）
pnpm test                 # 运行所有测试
pnpm --filter @schema-form/editor-web test -- --coverage
pnpm --filter @schema-form/editor-web test -- path/to/test.spec.ts  # 单个测试

# 数据库（本地 Docker MongoDB）
pnpm db:up                # 启动 MongoDB 容器
pnpm db:down              # 停止
pnpm db:seed              # 种子数据

# 部署
pnpm deploy:pack          # 本地编译 + 打包
pnpm deploy:run           # 上传 + 服务器启动
```

## 架构

### 业务层（business）

**Shell**（主宿主）：
- qiankun 宿主应用，加载子应用（editor、flow、ai、admin）
- 动态菜单系统：`useMenu` + `useMenuStore` + API `/api/menus/route`
- 布局切换：`ClassicSidebarLayout` / `TopNavLayout`，通过 `useLayoutStore` 管理
- 右侧属性面板由 `PropertyPanel.vue` 根据 Widget 的 `propertyPanel` 声明动态渲染

**Admin**（系统管理）：
- RBAC 权限管理、菜单管理、租户管理、审计日志

### 能力层（platform）

#### Editor（`@schema-form/editor-web`）

- **框架**: Vue 3.5 + `<script setup>` + TypeScript 5.7
- **UI**: Element Plus 2.9，**图表**: ECharts 6.1
- **Widget 系统**：`src/widgets/` 目录，通过 `registry.ts` 注册，`base/types.ts` 定义 `SchemaType`（50+ 种类型）
- **属性面板**：`PropertyPanel.vue` 驱动，`configPanels` 声明支持 events/rules/api/variables 四大配置系统
- **事件引擎**：`engine/eventEngine.ts`，18 种动作类型，通过 `EventExecutionContext` 注入运行时
- **路径别名**: `@/` → `src/`

#### Flow（流程引擎）

- **shared**（`platform/flow/shared/`）：BPMN 引擎核心，TypeScript 纯逻辑，前后端共用
- **web**（`platform/flow/web/`）：Vue 3 + Vue Flow 可视化设计器
- Token 执行模型，支持 12 种 BPMN 节点类型

#### AI（AI 助手）

- **app**（`platform/ai/app/`）：AI 对话界面，通过 iframe 嵌入 editor/flow
- **sdk**（`platform/ai/sdk/`）：Agent SDK
- **shared**（`platform/ai/shared/`）：AI 元数据 + promptBuilder

### 后端（`platform/server`）

- **框架**: Koa.js，ESM 模块（`"type": "module"`）
- **数据库**: MongoDB Atlas（生产）/ Docker MongoDB 8（本地），Mongoose ODM
- **认证**: JWT + bcryptjs
- **API 路由**: schema、auth、data、dict、options、mock、docs、health、flow CRUD
- **中间件栈**: errorHandler → helmet → bodyParser → CORS → routes

### 数据模型

**FormSchema** — 核心资源：
- `_id`: UUID string（非 ObjectId）
- `name`, `type`（form | search_list | layout | table | chart | business | report | other）, `status`（draft）
- `json`: Mixed — 存储 schema 树结构（`Widget[]`）
- `publishId`: 发布版本的唯一标识

### 部署

**服务器**：ubuntu@pyflow.icu，端口 8828（前端）、30001（后端）

**访问地址**：
- 主页：https://pyflow.icu/schema-platform/
- 编辑器：https://pyflow.icu/schema-platform/editor/
- 流程：https://pyflow.icu/schema-platform/flow/
- AI：https://pyflow.icu/schema-platform/ai/
- API：https://pyflow.icu/schema-platform/api/

### 环境变量

| 变量 | 用途 | 默认值 |
|---|---|---|
| `MONGODB_URI` | MongoDB 连接字符串 | `mongodb://localhost:27017/schema-form` |
| `NODE_ENV` | `development` / `production` | `development` |
| `PORT` | 服务器端口 | 3001（本地）/ 30001（线上） |
| `CORS_ORIGINS` | 允许的跨域来源，逗号分隔 | — |

### TypeScript 配置

- 根 `tsconfig.base.json`：共享编译选项（ES2022, ESNext module, bundler resolution）
- 前端：`vue-tsc -b`，`noEmit: true`，使用 `tsconfig.app.json` 和 `tsconfig.node.json`
- 后端：`tsc`，`noEmit: false`，输出到 `dist/`
- 业务层 tsconfig extends 路径：`../../../tsconfig.base.json`（比能力层多一层目录）

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
