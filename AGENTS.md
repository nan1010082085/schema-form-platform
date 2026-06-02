# AGENTS.md — AI Agent 架构文档

## 概述

schema-form-platform 使用 LangGraph StateGraph 实现多智能体对话式生成引擎。三个专家 Agent（Router / Editor / Flow）通过声明式图编排协作，配合 14 个 StructuredTool 实现表单 Schema 与流程图的自然语言驱动生成。

## 技术栈

| 组件 | 技术 |
|------|------|
| Agent 框架 | LangGraph StateGraph |
| LLM | DeepSeek Chat + JSON Mode |
| LLM 接口 | ChatOpenAI (@langchain/openai) |
| 工具格式 | StructuredTool (@langchain/core/tools) + zod |
| 工具执行 | ToolNode (@langchain/langgraph/prebuilt) |
| 状态管理 | Annotation.Root() + MessagesAnnotation |
| 流式传输 | graph.streamEvents() v2 → SSE |
| 状态持久化 | MemorySaver（开发）/ MongoDB（生产可选） |
| 领域知识 | @schema-form/shared-ai 动态 metadata |

## Graph 结构

```
START
  │
  ▼
routerNode ──(conditional)──► editorAgentNode ◄──► editorToolNode
  │                              │
  │                              ▼
  │                             END
  │
  └──(conditional)──► flowAgentNode ◄──► flowToolNode
                         │
                         ▼
                        END
```

### 节点

| 节点 | 类型 | 职责 |
|------|------|------|
| `router` | Agent Node | 意图分类（JSON Mode），分发到 editor/flow，支持多步任务链 |
| `editor` | Agent Node | Widget Schema 生成/修改，bindTools(editorTools) |
| `flow` | Agent Node | FlowGraph 生成/修改，bindTools(flowTools) |
| `editorTools` | ToolNode | 执行 editor 6 个 StructuredTool |
| `flowTools` | ToolNode | 执行 flow 6 个 StructuredTool |

### 条件边

- `routeAfterRouter(state)` — 根据 `state.currentAgent` 分发到 editor / flow / END
- `shouldCallTools(state)` — 检查最后一条 AIMessage 是否有 tool_calls，有则路由到对应 ToolNode

### 工具调用循环

LangGraph 自动管理工具调用循环：

1. Agent Node 调用 LLM，LLM 返回 tool_calls
2. 条件边 `shouldCallTools` 检测到 tool_calls，路由到 ToolNode
3. ToolNode 执行工具，结果写入 state.messages
4. ToolNode 通过固定边回到 Agent Node
5. Agent 再次调用 LLM（携带工具结果），重复直到无 tool_calls

## Agent 详细设计

### Router Agent (`graph/router.ts`)

- **模型**: deepseek-chat, 温度 0, maxTokens 200, JSON Mode
- **输入**: 最后一条用户消息
- **输出**: `{ target: 'editor' | 'flow' | 'chain', steps?: [...] }`
- **降级**: LLM 失败时回退到关键词匹配（FLOW_KEYWORDS）
- **任务链**: 当 target 为 'chain' 时，设置 taskChain 和 currentStepIndex

### Editor Agent (`graph/editorAgent.ts`)

- **模型**: deepseek-chat, 温度 0.7, maxTokens 8192, streaming, JSON Mode
- **工具绑定**: `.bindTools(editorTools)`
- **System Prompt**: 由 `buildEditorSystemPrompt(metadata)` 动态生成
- **上下文注入**: currentSchema、historySummary、preferences、turnCount
- **历史截断**: 最近 10 条消息

### Flow Agent (`graph/flowAgent.ts`)

- **模型**: deepseek-chat, 温度 0.7, maxTokens 8192, streaming, JSON Mode
- **工具绑定**: `.bindTools(flowTools)`
- **System Prompt**: 由 `buildFlowSystemPrompt(metadata)` 动态生成
- **上下文注入**: currentFlow、currentSchema、historySummary、preferences、turnCount

## 工具系统

### Editor Tools (6)

| Tool | 功能 | 关键逻辑 |
|------|------|---------|
| `search_schemas` | 搜索 Schema | MongoDB regex + type 筛选 |
| `get_schema_detail` | 获取 Schema 详情 | findById，返回完整 JSON |
| `search_published_schemas` | 搜索已发布 Schema | PublishedSchemaModel 查询 |
| `get_widget_catalogue` | Widget 目录 | 从 shared-ai metadata.json 动态读取 |
| `semantic_search_schemas` | 语义搜索 | Jaccard 相似度（中文 bigram + 英文分词） |
| `validate_schema` | Schema 校验 | 类型检查、ID 检查、容器嵌套规则 |

### Flow Tools (6)

| Tool | 功能 | 关键逻辑 |
|------|------|---------|
| `search_flows` | 搜索流程 | FlowDefinitionModel 查询 |
| `get_flow_detail` | 流程详情 | Definition + Version 联查 |
| `search_users` | 搜索用户 | UserModel 查询（审批指派） |
| `search_schemas` | 搜索表单 | userTask 表单绑定 |
| `generate_schema` | 生成表单 | 调用 schemaGenerator（直接 LLM） |
| `validate_flow` | 流程校验 | startEvent/endEvent、网关条件、指派人 |

### Widget Tools (2)

| Tool | 功能 |
|------|------|
| `query_widgets` | Widget 目录查询（按分类筛选） |
| `validate_widget_schema` | Widget Schema 结构校验 |

## State 定义 (`graph/state.ts`)

```typescript
AgentStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,      // 消息（自动合并语义）
  sessionId: string,
  conversationId: string,
  currentAgent: 'router' | 'editor' | 'flow',
  context: AIContext,              // source, schemaId, flowId, currentSchema, ...
  taskChain: TaskStep[],           // 多步任务链
  currentStepIndex: number,
  needsTool: boolean,
  toolResults: AgentToolResult[],
  error: AIError | null,
  preferences: Record<string, unknown>,
  historySummary: string,
  // ...
})
```

## SSE 事件流 (`routes.ts`)

通过 `graph.streamEvents(graphInput, { version: 'v2' })` 获取事件流：

| LangGraph 事件 | SSE 类型 | 说明 |
|----------------|---------|------|
| `on_chain_start` (editor/flow) | `agent_switch` | Agent 切换 |
| `on_chain_end` (router) | `task_chain` | 任务链步骤 |
| `on_chat_model_stream` | `text` | LLM token 流（跳过 router） |
| `on_tool_start` | `tool_call` (calling) | 工具开始 |
| `on_tool_end` | `tool_call` (result) + `schema`/`flow` | 工具完成 |

## @schema-form/shared-ai

构建时从 editor widget configs 和 flow node definitions 提取元数据，生成 `metadata.json`。

- `promptBuilder.ts` — 从 metadata 动态构建 system prompt
- `systemKnowledge.ts` — 事件系统、联动系统、变量系统知识
- `types.ts` — AIMetadata, WidgetAIMetadata, FlowNodeAIMetadata 类型

## 文件索引

```
packages/server/src/ai/
├── graph/state.ts           # AgentStateAnnotation
├── graph/graph.ts           # StateGraph 组装
├── graph/router.ts          # Router Node
├── graph/editorAgent.ts     # Editor Agent Node
├── graph/flowAgent.ts       # Flow Agent Node
├── graph/checkpointer.ts    # MemorySaver
├── graph/agentBase.ts       # 共享工具函数
├── tools/editorTools.ts     # 6 Editor StructuredTool
├── tools/flowTools.ts       # 6 Flow StructuredTool
├── tools/widgetTools.ts     # 2 Widget StructuredTool
├── prompts/router.ts        # Router prompt
├── prompts/editor.ts        # Editor prompt（备用）
├── prompts/flow.ts          # Flow prompt（备用）
├── routes.ts                # Koa 路由 + SSE
├── schemas/aiSchemas.ts     # 请求体校验
└── services/conversationService.ts  # 对话 CRUD

packages/shared/ai/
├── metadata.json            # 构建时自动生成
├── promptBuilder.ts         # 动态 prompt 构建
├── systemKnowledge.ts       # 系统知识
└── types.ts                 # 类型定义

packages/ai-app/src/
├── views/AiChatView.vue     # 完整页面
├── views/AiSidebarView.vue  # 抽屉模式
├── stores/ai.ts             # useAiStore
├── api/aiApi.ts             # SSE fetch
├── components/AiMessage.vue # 消息渲染
└── utils/bridge.ts          # 宿主通信
```
