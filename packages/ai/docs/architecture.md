# AI 架构文档 v1

> packages/ai 项目的 Agent、MCP、Tool 架构说明
>
> **注意**：v2 架构已设计完成，详见 [architecture-v2.md](./architecture-v2.md)

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI 应用层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   App    │  │   SDK    │  │  Shared  │  │  Server  │       │
│  │ (前端)   │  │ (客户端) │  │ (共享)   │  │ (服务端) │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LangGraph 层                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Router  │  │  Editor  │  │   Flow   │  │  Page    │       │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      工具层 (Tools)                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Schema   │  │   Flow   │  │   RAG    │  │ Widget   │       │
│  │  Tools   │  │  Tools   │  │  Tools   │  │  Tools   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MCP 层 (可选)                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  Schema  │  │   Flow   │  │  Widget  │                      │
│  │  Server  │  │  Server  │  │  Server  │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、Agent（智能体）

### 2.1 Agent 类型

| Agent | 职责 | System Prompt 来源 |
|-------|------|-------------------|
| **Router** | 分析用户意图，路由到正确的 Agent | 固定 prompt |
| **Editor** | 生成/编辑表单 Schema | `@schema-form/ai-shared/promptBuilder` |
| **Flow** | 生成/编辑流程 | `@schema-form/ai-shared/promptBuilder` |
| **Page** | 生成页面布局 | `@schema-form/ai-shared/promptBuilder` |
| **General** | 通用问答，不涉及具体业务 | 固定 prompt |

### 2.2 Agent 执行流程

```
用户消息
    │
    ▼
┌─────────┐
│ Router  │ ── 分析意图，选择 Agent
└─────────┘
    │
    ▼
┌─────────┐
│ Agent   │ ── 调用 LLM 生成响应
└─────────┘
    │
    ├── 无工具调用 ──► 返回文本响应
    │
    └── 有工具调用 ──► 执行工具 ──► 将结果反馈给 LLM ──► 继续生成
```

### 2.3 Agent 基类 (SDK)

`packages/ai/sdk/src/agent.ts` 提供了 `BaseAgent` 基类：

```typescript
abstract class BaseAgent {
  // 核心能力
  - LLM 调用（DeepSeek / OpenAI / 自定义）
  - 工具注册与执行
  - 多轮工具调用循环（最多 10 轮）
  - 流式响应（AsyncGenerator）
  - 消息历史管理（最多 20 条）

  // 公共 API
  execute(userMessage, context, history?): Promise<AgentResult>
  executeStream(userMessage, context, history?): AsyncGenerator<StreamEvent>
  getTools(): Array<{ name, description }>
}
```

### 2.4 LangGraph Agent (Server)

`packages/server/src/ai/graph/` 目录下的 Agent 实现：

```typescript
// editorAgent.ts - Editor Agent 节点
// - 使用 DeepSeek LLM
// - System prompt 动态构建自 metadata
// - 工具执行由 ToolNode 处理
// - 支持 RAG 上下文注入

// flowAgent.ts - Flow Agent 节点
// - 专门处理流程相关任务
// - 共享统一工具集

// pageAgent.ts - Page Agent 节点
// - 处理页面布局生成
```

---

## 三、Tool（工具）

### 3.1 工具分类

| 分类 | 工具名 | 功能 |
|------|--------|------|
| **Schema** | `search_schemas` | 搜索表单 Schema 列表 |
| | `get_schema_detail` | 获取 Schema 完整信息 |
| | `validate_schema` | 验证 Schema 结构 |
| | `update_schema` | 更新 Schema |
| | `search_published_schemas` | 搜索已发布版本 |
| **Flow** | `search_flows` | 搜索流程列表 |
| | `get_flow_detail` | 获取流程详情 |
| | `validate_flow` | 验证流程结构 |
| | `update_flow` | 更新流程 |
| | `save_and_bind_schema` | 保存并绑定 Schema 到流程节点 |
| **Widget** | `get_widget_catalogue` | 查询组件目录 |
| | `query_widgets` | 查询组件 |
| **RAG** | `rag_search` | 智能匹配 |
| | `rag_index` | RAG 索引 |
| **协作** | `request_collaboration` | 请求其他 Agent 协作 |

### 3.2 工具定义

`packages/ai/sdk/src/tool.ts` 提供了工具构建器：

```typescript
// 方式一：直接创建
const searchTool = createTool({
  name: 'search',
  description: '搜索数据',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词' }
    },
    required: ['query']
  },
  execute: async (params, context) => {
    return await searchData(params.query as string)
  }
})

// 方式二：使用构建器
const searchTool = buildTool()
  .name('search')
  .description('搜索数据')
  .parameters(b => b.string('query', '搜索关键词', { required: true }))
  .execute(async (params, context) => {
    return await searchData(params.query as string)
  })
  .build()
```

### 3.3 工具注册表

```typescript
class ToolRegistry {
  register(tool: ToolDefinition): this
  registerAll(tools: ToolDefinition[]): this
  get(name: string): ToolDefinition | undefined
  has(name: string): boolean
  getAll(): ToolDefinition[]
  toOpenAITools(): Array<{ type: 'function', function: { name, description, parameters } }>
  execute(name, params, context): Promise<unknown>
}
```

### 3.4 统一工具集

`packages/server/src/ai/tools/allTools.ts` 合并了所有工具：

```typescript
export const allTools = [
  // Schema 工具
  searchSchemasTool,
  getSchemaDetailTool,
  validateSchemaTool,
  updateSchemaTool,
  // ...

  // Flow 工具
  searchFlowsTool,
  getFlowDetailTool,
  validateFlowTool,
  updateFlowTool,
  // ...

  // Widget 工具
  ...widgetTools,

  // RAG 工具
  ...ragTools,

  // 协作工具
  requestCollaborationTool,
]
```

**设计原则**：所有 Agent 都可以访问所有工具，通过 `request_collaboration` 实现 Agent 间协作。

---

## 四、MCP（Model Context Protocol）

### 4.1 MCP 是什么

MCP 是一种协议，允许 AI Agent 通过标准化接口访问外部工具和数据源。

### 4.2 MCP Server 实现

`packages/server/src/ai/mcp/` 目录下有 3 个 MCP Server：

| Server | 功能 | 工具前缀 |
|--------|------|----------|
| `schemaServer.ts` | Schema 相关工具 | `schema__` |
| `flowServer.ts` | Flow 相关工具 | `flow__` |
| `widgetServer.ts` | Widget 相关工具 | `widget__` |

### 4.3 MCP 工具示例

```typescript
// schemaServer.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function createSchemaServer(): McpServer {
  const server = new McpServer({
    name: 'schema-form-schemas',
    version: '2.0.0',
  })

  server.tool(
    'schema__search',
    '搜索表单 Schema 列表',
    {
      keyword: z.string().optional(),
      type: z.enum(['form', 'search_list']).optional(),
      limit: z.number().default(10),
    },
    async (params) => {
      const result = await handleSchemaSearch(params)
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )

  return server
}
```

### 4.4 MCP 与 LangGraph 工具的关系

```
┌─────────────────────────────────────────────────────────┐
│                    共享业务逻辑层                        │
│              (toolHandlers.ts)                          │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  LangGraph 工具 │  │   MCP Server    │  │   HTTP API      │
│  (直接调用)     │  │  (MCP 协议)     │  │   (REST)        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**关键点**：MCP Server 和 LangGraph 工具共享同一份 `toolHandlers` 业务逻辑，只是暴露方式不同。

---

## 五、数据流

### 5.1 用户发送消息

```
用户输入
    │
    ▼
AiSidebarView.vue
    │
    ▼
useAiStore.sendMessage()
    │
    ▼
useStreamStore.executeStream()
    │
    ▼
emitChatSend() ── WebSocket ──► Server
```

### 5.2 服务端处理

```
chatStreamHandler.ts
    │
    ▼
executeChatStream()
    │
    ▼
graph.streamEvents()
    │
    ├── Router Agent ──► 选择 Agent
    │
    ├── Editor/Flow Agent ──► 调用 LLM
    │       │
    │       └── 工具调用 ──► ToolNode ──► toolHandlers.ts
    │
    └── 流式事件 ──► sendEvent() ──► WebSocket ──► Client
```

### 5.3 前端渲染

```
onChatEvent()
    │
    ▼
handleStreamEvent()
    │
    ├── text_delta ──► 更新消息内容
    ├── thinking_delta ──► 更新思考过程
    ├── tool_call_start ──► 显示工具调用
    ├── tool_call_end ──► 显示工具结果
    ├── schema_complete ──► 显示 Schema 预览
    ├── flow_complete ──► 显示 Flow 预览
    └── done ──► 完成
```

---

## 六、事件协议

### 6.1 事件类型

```typescript
type AgentEventType =
  // 文本流
  | 'text_delta'
  | 'thinking_delta'
  // Schema 生成
  | 'schema_start'
  | 'schema_progress'
  | 'schema_complete'
  | 'schema_diff'
  // Flow 生成
  | 'flow_start'
  | 'flow_progress'
  | 'flow_complete'
  | 'flow_diff'
  // 工具调用
  | 'tool_call_start'
  | 'tool_call_end'
  | 'tool_error'
  // Agent 协作
  | 'agent_switch'
  | 'agent_collaboration'
  // 任务链
  | 'chain_start'
  | 'chain_step'
  | 'chain_complete'
  // 人工介入
  | 'interrupt'
  | 'resume'
  // 状态
  | 'done'
  | 'error'
```

### 6.2 事件流向

```
Server                              Client
   │                                   │
   │──── chat:event ──────────────────►│
   │     { type, content, ... }        │
   │                                   │
   │◄─── chat:send ───────────────────│
   │     { message, context }          │
   │                                   │
   │◄─── chat:cancel ─────────────────│
   │                                   │
   │◄─── chat:resume ─────────────────│
   │     { threadId, confirmed }       │
```

---

---

## 八、目录结构

```
packages/ai/docs/
├── architecture.md       # 架构文档 v1（本文件）
├── architecture-v2.md    # 架构文档 v2（新增需求分析和思考推理）
├── agent.md              # Agent 详细说明
├── tool.md               # Tool 详细说明
├── mcp.md                # MCP 详细说明
└── events.md             # 事件协议
```

## 九、相关文档

- [架构 v2](./architecture-v2.md) — 新增需求分析、任务规划、思考推理
- [Agent 详细说明](./agent.md) — Agent 类型、职责、执行流程
- [Tool 详细说明](./tool.md) — 工具定义、注册、执行和扩展
- [MCP 详细说明](./mcp.md) — Model Context Protocol 概念和实现
- [事件协议](./events.md) — 流式通信的事件类型和数据格式
