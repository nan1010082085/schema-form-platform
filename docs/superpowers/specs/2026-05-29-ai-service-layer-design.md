# AI 支撑层架构设计

## 概述

为 schema-form-platform 引入 AI 能力层，通过 LangGraph 多智能体架构 + DeepSeek 模型，实现对话式 Schema 生成（表单、列表页、页面）和流程生成。AI 作为独立微应用接入，与可视化编辑器和流程设计器通过 microApp 机制集成。

## 决策记录

| 决策 | 结论 | 理由 |
|---|---|---|
| AI 框架 | LangGraph | 多步对话、状态管理、多智能体协作原生支持 |
| 模型提供商 | DeepSeek | 成本低、中文能力强、OpenAI 兼容接口 |
| 语言 | TypeScript 全栈 | 与项目统一 |
| 交互模式 | 对话式（多轮） | 用户可逐步细化需求 |
| Agent 模式 | 混合路由（Router + 专家 + 协作） | 自动分发 + 手动切换 + 复杂任务多专家协作 |
| 服务位置 | `packages/server/src/ai/` | 复用现有服务，独立 AI 模块 |
| 前端位置 | `packages/ai-app/` | 独立 Vue 3 微应用 |
| 集成方式 | microApp | 动态嵌入 Editor 和 Flow |
| Memory | LangGraph State + @langchain/mongodb | 短期/工作记忆用 State，长期记忆用 MongoDBChatMessageHistory |
| 领域知识 | 纯 Prompt（Phase 1） | Widget/节点类型有限集，系统提示词装得下 |
| 向量存储 | MongoDB Atlas Vector Search | 复用现有 MongoDB Atlas，@langchain/mongodb 一套包覆盖 |

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        宿主应用 (Portal)                      │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Editor     │    │    Flow      │    │   ai-app     │   │
│  │  (编辑器)     │    │  (流程引擎)   │    │  (AI 微应用)  │   │
│  │              │    │              │    │              │   │
│  │  ┌────────┐  │    │  ┌────────┐  │    │  ┌────────┐  │   │
│  │  │microApp│  │    │  │microApp│  │    │  │Chat UI │  │   │
│  │  │ai-app  │  │    │  │ai-app  │  │    │  │Preview │  │   │
│  │  └────────┘  │    │  └────────┘  │    │  │Publish │  │   │
│  └──────┬───────┘    └──────┬───────┘    └────┬─────┘  │   │
│         │                   │                 │         │   │
│         └───────────────────┼─────────────────┘         │   │
│                             │                           │   │
└─────────────────────────────┼───────────────────────────┘   │
                              │                               │
                    ┌─────────▼──────────┐                    │
                    │  packages/server   │                    │
                    │                    │                    │
                    │  ┌──────────────┐  │                    │
                    │  │  src/ai/     │  │                    │
                    │  │  ┌────────┐  │  │                    │
                    │  │  │Router  │  │  │                    │
                    │  │  │Agent   │  │  │                    │
                    │  │  └───┬────┘  │  │                    │
                    │  │  ┌───┴────┐  │  │                    │
                    │  │  │Editor  │  │  │                    │
                    │  │  │Agent   │  │  │                    │
                    │  │  ├────────┤  │  │                    │
                    │  │  │Flow    │  │  │                    │
                    │  │  │Agent   │  │  │                    │
                    │  │  └────────┘  │  │                    │
                    │  │  LangGraph   │  │                    │
                    │  │  DeepSeek    │  │                    │
                    │  └──────────────┘  │                    │
                    └───────────────────┘                    │
```

## Agent 设计

### Router Agent

**职责**：意图识别，将用户请求分发到对应专家，或协调多专家协作。

**输入**：用户自然语言描述 + 上下文（来源系统、当前 Schema/Flow）

**输出**：路由决策

```ts
type RouterDecision =
  | { target: 'editor'; task: string }
  | { target: 'flow'; task: string }
  | { target: 'collaborate'; editorTask: string; flowTask: string }
```

**路由规则**：
- 涉及表单、列表、页面、UI、组件、字段 → Editor Agent
- 涉及流程、审批、节点、分支、条件 → Flow Agent
- 涉及"从表单发起流程"、"节点绑定表单"等跨域需求 → 协作模式

### Editor Agent

**职责**：生成/修改 Widget Schema（表单、列表页、业务页面）。

**领域知识**：
- Widget 类型系统：35+ 种组件（input、select、table、form、card、tabs 等）
- 布局系统：绝对定位 + 容器嵌套（form、card、row-col、tabs）
- 事件系统：16 种事件动作
- 联动系统：visible、disabled、required、options、set-value
- 校验规则：required、pattern、自定义校验

**Tools**：

| Tool | 功能 |
|---|---|
| `query_widgets` | 查询可用组件列表及属性 |
| `validate_schema` | 校验 Widget Schema 合法性 |
| `calculate_layout` | 计算布局坐标（自动排列） |
| `get_field_template` | 获取字段模板（常用字段快速生成） |

**输出 Schema**：

```ts
interface EditorAgentOutput {
  type: 'schema_update'
  widgets: Widget[]          // 生成的 Widget 数组
  board?: Partial<Board>     // 画布配置（变量、事件）
  explanation: string        // 对话回复文本
}
```

**Prompt 核心约束**：
- 必须输出合法的 `Widget[]` JSON
- 每个 Widget 必须包含 `id`、`type`、`field`、`label`、`position`
- 容器组件必须正确嵌套 children
- 布局坐标不能重叠
- 遵循项目的组件嵌套唯一规则（基础组件只嵌套在布局组件内）

### Flow Agent

**职责**：生成/修改流程图（BpmnGraph）。

**领域知识**：
- BPMN 节点类型：12 种（startEvent、endEvent、userTask、serviceTask、exclusiveGateway 等）
- 节点配置：审批人、表单绑定、条件表达义、定时器
- 连线配置：条件表达式、默认流
- 流程校验规则：单起点、可达性、网关默认流

**Tools**：

| Tool | 功能 |
|---|---|
| `query_node_types` | 查询可用节点类型及配置项 |
| `validate_flow` | 校验流程图合法性 |
| `generate_expression` | 生成条件表达式 |
| `get_flow_template` | 获取流程模板（审批流、业务流） |

**输出 Schema**：

```ts
interface FlowAgentOutput {
  type: 'flow_update'
  graph: FlowGraph           // 节点 + 连线
  metadata?: FlowGraphMetadata
  explanation: string
}
```

### 协作模式

当 Router 判定需要多专家协作时（如"创建一个请假流程，包含请假表单"）：

```
[Router] → 拆分任务
  ├── Editor Agent: 生成请假表单 Schema
  └── Flow Agent: 生成审批流程图，引用表单 publishId
      │
      ▼
  合并结果 → 返回给用户
```

协作通过 LangGraph 的子图（subgraph）实现，Router 作为编排者依次调用专家并传递上下文。

## AI 基础设施：Memory / RAG / 向量库

### Memory 体系

LangGraph 原生支持多层记忆，无需额外框架。

| 记忆类型 | 用途 | 实现方式 | 生命周期 |
|---|---|---|---|
| 短期记忆 | 当前对话上下文、多轮消息 | LangGraph State 的 `messages[]` | 单次会话 |
| 工作记忆 | 当前正在构建的 Schema / Flow | LangGraph State 的 `currentSchema` / `currentFlow` | 单次会话 |
| 长期记忆 | 跨会话的用户偏好、历史对话 | MongoDB `AIConversation` 集合 | 持久化 |

**短期记忆**：LangGraph 的 `MessagesAnnotation` 自动管理对话历史，支持消息裁剪（trim）防止 Token 超限。

**工作记忆**：自定义 State 中的 `currentSchema` / `currentFlow` 字段，随对话推进实时更新，供 Agent 在后续轮次中参考和修改。

**长期记忆**：对话结束后将 messages 持久化到 MongoDB。新会话可通过 `conversationId` 恢复历史上下文。未来可扩展为用户偏好学习（如"这个用户喜欢紧凑布局"）。

### RAG 策略

核心问题：Agent 如何获取项目领域知识（Widget 类型、节点配置、Schema 结构）？

**Phase 1：纯 Prompt Engineering + 基础向量存储**

将领域知识直接注入系统提示词，同时引入 `@langchain/mongodb` 做对话历史持久化和基础向量存储：

```ts
// Editor Agent 系统提示词包含：
const editorSystemPrompt = `
你是表单/页面生成专家。以下是可用的 Widget 类型：

## 基础组件
- input: 文本输入框，props: { placeholder, maxlength, showWordLimit }
- select: 下拉选择，props: { multiple }, options: [{ label, value }]
- number: 数字输入，props: { min, max, step, precision }
- date: 日期选择，props: { type: 'date'|'daterange', format }
- ...

## 布局组件
- form: 表单容器，props: { labelWidth, labelPosition }
- card: 卡片容器，props: { title, shadow }
- row-col: 栅格布局，props: { cols: [{ span }] }
- tabs: 选项卡，props: { type: 'border-card' }
- ...

## 规则
1. 基础组件只能嵌套在布局组件内
2. 每个组件必须有 position: { x, y, w, h, zIndex }
3. 布局坐标不能重叠
...
`
```

**优势**：
- 延迟最低（无检索步骤）
- Widget 类型是有限集（35 种），系统提示词完全放得下
- `@langchain/mongodb` 提供对话历史持久化（`MongoDBChatMessageHistory`），复用现有 MongoDB 实例

**Phase 2+：RAG 检索增强（在现有向量存储基础上扩展）**

`@langchain/mongodb` 已在 Phase 1 引入，Phase 2 只需增加向量检索的使用场景：
- 用户自定义 Widget / 模板数量增长到 Prompt 放不下
- 需要检索历史生成的优秀案例作为参考
- 需要理解项目特定的业务术语和字段命名习惯

### 向量库选型

Phase 1 即引入 `@langchain/mongodb`，使用 MongoDB Atlas Vector Search 作为向量存储。

**选定方案：MongoDB Atlas Vector Search**

理由：
- 项目已经在用 MongoDB Atlas，零额外基础设施
- `@langchain/mongodb` 提供 `MongoDBAtlasVectorSearch` 和 `MongoDBChatMessageHistory`，一套包覆盖两个需求
- 对话数据和向量数据在同一数据库，查询效率高
- Phase 1 先用对话历史持久化，Phase 2 开启向量检索，无需新增依赖

### 基础设施演进路线

```
Phase 1（最小闭环）：
  ├── LangGraph State              → 短期记忆 + 工作记忆
  ├── @langchain/mongodb           → 对话历史持久化（MongoDBChatMessageHistory）
  ├── 纯 Prompt                    → 领域知识注入（Widget 类型 + 节点类型 + 规则）
  └── DeepSeek API                 → LLM 推理

Phase 2+（按需扩展）：
  └── @langchain/mongodb           → RAG 向量检索（MongoDBAtlasVectorSearch）
      ├── 向量化 Widget 模板库
      ├── 向量化历史优秀生成案例
      └── 向量化业务术语表
```

## 对话状态

```ts
interface AIConversationState {
  // 对话历史
  messages: AIMessage[]

  // 当前活跃的 Agent
  activeAgent: 'router' | 'editor' | 'flow'

  // 业务上下文
  context: {
    // 来源系统
    source: 'editor' | 'flow' | 'standalone'

    // 关联资源
    schemaId?: string
    flowId?: string

    // 当前生成物
    currentSchema?: Widget[]
    currentFlow?: FlowGraph

    // 对话轮次
    turnCount: number
  }

  // 待确认操作
  pendingAction?: {
    type: 'preview' | 'publish' | 'modify'
    payload: Widget[] | FlowGraph
    description: string
  }

  // 错误状态
  error?: {
    message: string
    recoverable: boolean
  }
}
```

## API 设计

### POST /api/ai/chat

对话接口，SSE 流式响应。

**请求**：

```ts
interface ChatRequest {
  conversationId?: string    // 首次不传，后续带上
  message: string            // 用户消息
  context: {
    source: 'editor' | 'flow' | 'standalone'
    schemaId?: string        // 编辑器场景：当前 Schema ID
    flowId?: string          // 流程场景：当前流程 ID
    nodeId?: string          // 流程场景：当前节点 ID
  }
}
```

**响应**（SSE 流）：

```ts
// 文本消息
{ type: 'text', content: string }

// Schema 生成结果
{ type: 'schema', payload: Widget[], description: string }

// Flow 生成结果
{ type: 'flow', payload: FlowGraph, description: string }

// 工具调用（可选，展示中间过程）
{ type: 'tool_call', name: string, input: unknown, output: unknown }

// 完成
{ type: 'done', conversationId: string }
```

### POST /api/ai/publish

发布生成物并绑定到目标。

**请求**：

```ts
interface PublishRequest {
  conversationId: string
  type: 'schema' | 'flow'
  payload: Widget[] | FlowGraph
  target?: {
    type: 'flow_node'        // 绑定到流程节点
    flowId: string
    nodeId: string
  }
}
```

**响应**：

```ts
interface PublishResponse {
  id: string                 // 发布后的 ID
  publishId?: string         // Schema 的 publishId
  boundTo?: {
    flowId: string
    nodeId: string
  }
}
```

### GET /api/ai/conversations/:id

获取对话历史（用于恢复上下文）。

### DELETE /api/ai/conversations/:id

删除对话。

## 前端 ai-app 设计

### 技术栈

- Vue 3 + TypeScript + Vite
- Element Plus（与项目统一）
- SSE 客户端（EventSource）

### 页面结构

```
┌─────────────────────────────────────────┐
│  AI Assistant                    [角色▼] │
├────────────────────┬────────────────────┤
│                    │                    │
│   对话区域          │   预览区域          │
│                    │                    │
│  ┌──────────────┐  │  ┌──────────────┐  │
│  │ AI: 我帮你... │  │  │  表单预览     │  │
│  │              │  │  │  (Schema 渲染) │  │
│  │ 用户: 再加.. │  │  │              │  │
│  │              │  │  │              │  │
│  └──────────────┘  │  └──────────────┘  │
│                    │                    │
│  ┌──────────────┐  │  ┌──────────────┐  │
│  │ 输入框        │  │  │ [预览] [发布] │  │
│  └──────────────┘  │  └──────────────┘  │
└────────────────────┴────────────────────┘
```

### 核心组件

| 组件 | 职责 |
|---|---|
| `AiChat.vue` | 对话主界面，管理消息列表和输入 |
| `AiMessage.vue` | 单条消息渲染（支持文本、Schema 卡片、Flow 卡片） |
| `AiPreview.vue` | Schema/Flow 预览面板 |
| `AiRoleSwitcher.vue` | Agent 角色切换下拉 |
| `AiPublishDialog.vue` | 发布确认弹窗 |

### 嵌入方式

```ts
// Editor 中嵌入
<micro-app
  name="ai-app"
  :url="AI_APP_URL"
  :data="{ source: 'editor', schemaId: currentSchemaId }"
/>

// Flow 中嵌入
<micro-app
  name="ai-app"
  :url="AI_APP_URL"
  :data="{ source: 'flow', flowId: currentFlowId, nodeId: selectedNodeId }"
/>
```

### 通信协议

ai-app 与宿主（Editor/Flow）通过 postMessage 通信：

```ts
// ai-app → 宿主
{ type: 'ai:preview-schema', payload: Widget[] }
{ type: 'ai:preview-flow', payload: FlowGraph }
{ type: 'ai:published', payload: { id, publishId, type } }

// 宿主 → ai-app
{ type: 'ai:set-context', payload: { source, schemaId?, flowId?, nodeId? } }
{ type: 'ai:current-schema', payload: Widget[] }  // 传入当前 Schema 供参考
```

## 目录结构

```
packages/
├── server/src/
│   └── ai/
│       ├── index.ts                 # AI 模块入口，路由注册
│       ├── routes.ts                # /api/ai/* 路由定义
│       ├── graph/
│       │   ├── state.ts             # AIConversationState 定义
│       │   ├── router.ts            # Router Agent
│       │   ├── editorAgent.ts       # Editor Agent
│       │   ├── flowAgent.ts         # Flow Agent
│       │   └── index.ts             # LangGraph StateGraph 组装
│       ├── tools/
│       │   ├── widgetTools.ts       # Editor Agent Tools
│       │   └── flowTools.ts         # Flow Agent Tools
│       ├── prompts/
│       │   ├── router.ts            # Router 系统提示词
│       │   ├── editor.ts            # Editor 系统提示词（含 Widget 类型知识）
│       │   └── flow.ts              # Flow 系统提示词（含 BPMN 知识）
│       ├── schemas/
│       │   └── aiSchemas.ts         # Zod schema（请求/响应校验）
│       └── services/
│           └── conversationService.ts  # 对话持久化（MongoDB）
│
├── ai-app/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── api/
│       │   └── aiApi.ts             # SSE 客户端 + API 调用
│       ├── components/
│       │   ├── AiChat.vue
│       │   ├── AiMessage.vue
│       │   ├── AiPreview.vue
│       │   ├── AiRoleSwitcher.vue
│       │   └── AiPublishDialog.vue
│       ├── stores/
│       │   └── ai.ts                # Pinia store：对话状态管理
│       ├── types/
│       │   └── index.ts             # 前端类型定义
│       └── utils/
│           └── bridge.ts            # microApp postMessage 通信
```

## 数据模型

### AIConversation（MongoDB）

```ts
interface AIConversation {
  _id: string                          // UUID
  source: 'editor' | 'flow' | 'standalone'
  schemaId?: string
  flowId?: string
  nodeId?: string
  messages: {
    role: 'user' | 'assistant' | 'system'
    content: string
    schema?: Widget[]
    flow?: FlowGraph
    timestamp: Date
  }[]
  activeAgent: 'router' | 'editor' | 'flow'
  createdAt: Date
  updatedAt: Date
}
```

## 依赖

```json
{
  "@langchain/langgraph": "^0.x",
  "@langchain/core": "^0.x",
  "@langchain/deepseek": "^0.x",
  "@langchain/mongodb": "^0.x",
  "zod": "^3.x"
}
```

| 包名 | 用途 |
|---|---|
| `@langchain/langgraph` | 多智能体状态图编排 |
| `@langchain/core` | LangChain 核心抽象（messages、tools、output parsers） |
| `@langchain/deepseek` | DeepSeek 模型接入（OpenAI 兼容协议） |
| `@langchain/mongodb` | MongoDB 集成：向量存储（`MongoDBAtlasVectorSearch`）+ 对话历史持久化（`MongoDBChatMessageHistory`） |
| `zod` | 结构化输出 Schema 约束 |
```

## 实施阶段

### Phase 1：最小闭环
- Server：Router Agent + Editor Agent，单轮生成 Widget Schema
- ai-app：对话 UI + Schema 预览 + 发布
- 验证：描述 → 生成表单 → 预览 → 发布到 Editor

### Phase 2：多轮对话
- Editor Agent 支持上下文感知的修改（"再加一个字段"）
- 对话持久化（MongoDB）
- SSE 流式响应

### Phase 3：Flow Agent
- Flow Agent 实现，支持流程图生成
- 协作模式：Editor + Flow 联合生成
- 发布绑定到 Flow 节点

### Phase 4：能力增强
- Agent Tools 完善（模板库、校验、布局计算）
- 对话历史恢复
- 错误修正（Schema 校验失败后自动修正）
