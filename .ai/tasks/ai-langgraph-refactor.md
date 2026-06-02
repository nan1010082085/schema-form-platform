# AI Agent LangGraph 重构计划

## 背景

设计文档明确选择 LangGraph 作为多智能体框架，但实际实现时用纯 TS 手写了 Agent 循环（while + toolRound + AsyncGenerator），重复造了 LangGraph 已经提供的轮子。

**核心问题**：手写的 agentBase.ts / editorAgent.ts / flowAgent.ts / router.ts 需要全部迁移到 LangGraph。

**保留的部分**：
- `packages/shared/ai/` 动态元数据系统
- `tools/*.ts` Tool 定义和实现
- `prompts/*.ts` System prompt
- `services/conversationService.ts` 对话持久化
- `ai-app/` 前端适配（task_chain、summary、语义搜索等）

---

## 架构设计

### LangGraph 核心概念映射

| LangGraph 概念 | 我们系统的对应 | 实现方式 |
|---------------|--------------|---------|
| **StateGraph** | Router → Editor/Flow 编排 | `new StateGraph(AgentState)` |
| **State (Annotation)** | AIConversationState | `Annotation.Root({...})` |
| **Node** | router / editorAgent / flowAgent | 普通 async 函数 |
| **ToolNode** | editorTools / flowTools | `new ToolNode(tools)` |
| **Conditional Edge** | Router 分发 + tool call 循环 | `addConditionalEdge()` |
| **Checkpointer** | 对话持久化 | MongoDB Checkpointer |
| **graph.stream()** | SSE 流式输出 | `streamMode: 'updates'` |
| **Subgraph** | Editor + Flow 协作 | `graph.addNode(subgraph)` |

### 最终文件结构

```
packages/server/src/ai/
├── graph/
│   ├── state.ts              ← Annotation 定义
│   ├── nodes/
│   │   ├── router.ts         ← routerNode
│   │   ├── editorAgent.ts    ← editorAgentNode
│   │   └── flowAgent.ts      ← flowAgentNode
│   ├── tools/
│   │   ├── editorTools.ts    ← 保留，包装为 StructuredTool
│   │   ├── flowTools.ts      ← 保留，包装为 StructuredTool
│   │   └── schemaGenerator.ts ← 保留
│   ├── graph.ts              ← StateGraph 组装 + 编译
│   └── index.ts              ← 导出 compiled app
├── prompts/
│   ├── editor.ts             ← 保留
│   ├── flow.ts               ← 保留
│   └── router.ts             ← 保留
├── services/
│   ├── conversationService.ts ← 保留
│   └── checkpointer.ts       ← 新增，MongoDB Checkpointer
├── routes.ts                 ← 简化，调用 graph.stream()
├── schemas/
│   └── aiSchemas.ts          ← 保留
└── __tests__/                ← 更新测试

packages/shared/ai/           ← 保留不动
packages/ai-app/              ← 保留不动
```

### Graph 流程图

```
START
  ↓
[router] ──→ conditional_edge
  ↓              ↓
  ↓         editorAgent ←→ editorTools (tool call 循环)
  ↓              ↓
  ↓            END
  ↓
  ↓         flowAgent ←→ flowTools (tool call 循环)
  ↓              ↓
  ↓            END
```

### State 定义

```typescript
import { Annotation } from '@langchain/langgraph'

const AgentState = Annotation.Root({
  // 对话消息（LangGraph 自动管理）
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  // 当前活跃 Agent
  activeAgent: Annotation<'router' | 'editor' | 'flow'>({
    default: () => 'router',
  }),
  // 业务上下文
  context: Annotation<AIContext>({
    default: () => ({ source: 'standalone', turnCount: 0 }),
  }),
  // 生成物
  currentSchema: Annotation<Record<string, unknown>[] | null>({
    default: () => null,
  }),
  currentFlow: Annotation<FlowGraph | null>({
    default: () => null,
  }),
  // 错误
  error: Annotation<{ message: string; recoverable: boolean } | null>({
    default: () => null,
  }),
})
```

### Node 实现

```typescript
// router.ts
async function routerNode(state: typeof AgentState.State) {
  const model = new ChatDeepSeek({ modelName: 'deepseek-chat', temperature: 0 })
  const result = await model.invoke([
    new SystemMessage(ROUTER_SYSTEM_PROMPT),
    ...state.messages,
  ])
  const parsed = JSON.parse(result.content)
  return { activeAgent: parsed.target === 'flow' ? 'flow' : 'editor' }
}

// editorAgent.ts
async function editorAgentNode(state: typeof AgentState.State) {
  const systemPrompt = await getEditorSystemPrompt()
  const model = new ChatDeepSeek({ modelName: 'deepseek-chat', temperature: 0.7 })
    .bindTools(editorTools)
  const result = await model.invoke([
    new SystemMessage(systemPrompt),
    ...buildContextMessages(state),
  ])
  return { messages: [result] }
}
```

### Tool 包装

```typescript
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

const searchSchemasTool = tool(
  async (args) => {
    const result = await searchSchemas(args)
    return result.summary ?? JSON.stringify(result.data)
  },
  {
    name: 'search_schemas',
    description: '搜索已有的表单 Schema 列表',
    schema: z.object({
      keyword: z.string().optional(),
      type: z.enum(['form', 'search_list']).optional(),
      limit: z.number().optional(),
    }),
  }
)
```

### Graph 组装

```typescript
import { StateGraph, START, END } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'

const editorToolNode = new ToolNode(editorTools)
const flowToolNode = new ToolNode(flowTools)

function shouldContinue(state: typeof AgentState.State) {
  const lastMessage = state.messages[state.messages.length - 1]
  if (isAIMessage(lastMessage) && lastMessage.tool_calls?.length > 0) {
    return 'tools'
  }
  return END
}

function routeAgent(state: typeof AgentState.State) {
  return state.activeAgent === 'flow' ? 'flowAgent' : 'editorAgent'
}

const graph = new StateGraph(AgentState)
  .addNode('router', routerNode)
  .addNode('editorAgent', editorAgentNode)
  .addNode('editorTools', editorToolNode)
  .addNode('flowAgent', flowAgentNode)
  .addNode('flowTools', flowToolNode)
  .addEdge(START, 'router')
  .addConditionalEdge('router', routeAgent)
  .addConditionalEdge('editorAgent', shouldContinue, {
    tools: 'editorTools',
    [END]: END,
  })
  .addEdge('editorTools', 'editorAgent')
  .addConditionalEdge('flowAgent', shouldContinue, {
    tools: 'flowTools',
    [END]: END,
  })
  .addEdge('flowTools', 'flowAgent')

const app = graph.compile({ checkpointer })
```

### SSE 流式输出

```typescript
// routes.ts
router.post('/chat', async (ctx) => {
  const stream = app.streamEvents(state, {
    version: 'v2',
    configurable: { thread_id: conversationId },
  })

  ctx.set({ 'Content-Type': 'text/event-stream' })
  const passThrough = new PassThrough()
  ctx.body = passThrough

  for await (const event of stream) {
    if (event.event === 'on_chat_model_stream') {
      // 流式文本
      passThrough.write(`data: ${JSON.stringify({ type: 'text', content: event.data.chunk.content })}\n\n`)
    } else if (event.event === 'on_tool_start') {
      // 工具调用开始
      passThrough.write(`data: ${JSON.stringify({ type: 'tool_call', phase: 'calling', name: event.name })}\n\n`)
    } else if (event.event === 'on_tool_end') {
      // 工具调用结束
      passThrough.write(`data: ${JSON.stringify({ type: 'tool_call', phase: 'result', name: event.name, result: event.data.output })}\n\n`)
    }
  }
})
```

---

## 任务列表

### Task 1: 定义 State（Annotation）
- **目标**：用 LangGraph Annotation 替代手写的 AIConversationState
- **文件**：`packages/server/src/ai/graph/state.ts`
- **操作**：重写为 Annotation.Root 定义
- **验收**：类型正确，可被 Graph 使用

### Task 2: 包装 Tools（StructuredTool）
- **目标**：将现有 tool 定义包装为 LangGraph 的 StructuredTool
- **文件**：
  - `packages/server/src/ai/tools/editorTools.ts`
  - `packages/server/src/ai/tools/flowTools.ts`
- **操作**：用 `tool()` 函数包装，添加 zod schema
- **验收**：ToolNode 可正常调用

### Task 3: 实现 Nodes
- **目标**：实现 routerNode、editorAgentNode、flowAgentNode
- **文件**：
  - `packages/server/src/ai/graph/nodes/router.ts`
  - `packages/server/src/ai/graph/nodes/editorAgent.ts`
  - `packages/server/src/ai/graph/nodes/flowAgent.ts`
- **操作**：用 ChatDeepSeek + prompt 实现，替换 AsyncGenerator
- **验收**：单个 Node 可独立运行

### Task 4: 组装 Graph
- **目标**：用 StateGraph 组装完整的 Agent 图
- **文件**：`packages/server/src/ai/graph/graph.ts`
- **操作**：定义节点、条件边、编译
- **验收**：graph.invoke() 可端到端运行

### Task 5: 接入 Checkpointer
- **目标**：用 LangGraph Checkpointer 替代手写的 conversationService
- **文件**：
  - `packages/server/src/ai/services/checkpointer.ts`（新增）
  - `packages/server/src/ai/services/conversationService.ts`（改造）
- **操作**：实现 MongoDB Checkpointer
- **验收**：对话状态可持久化和恢复

### Task 6: 改造 routes.ts
- **目标**：用 graph.streamEvents() 替代手写 SSE
- **文件**：`packages/server/src/ai/routes.ts`
- **操作**：调用 graph.streamEvents()，映射到 SSE 事件
- **验收**：前端 SSE 事件格式不变

### Task 7: 清理旧代码
- **目标**：删除手写的 Agent 循环代码
- **文件**：
  - 删除 `agentBase.ts`（或保留工具函数，删除 Agent 循环）
  - 删除 `editorAgent.ts` 旧的 AsyncGenerator
  - 删除 `flowAgent.ts` 旧的 AsyncGenerator
  - 删除 `router.ts` 旧的 routerNode
- **操作**：确认新代码工作后删除
- **验收**：编译通过，测试通过

### Task 8: 更新测试
- **目标**：更新测试以适配 LangGraph 架构
- **文件**：`packages/server/src/ai/__tests__/`
- **操作**：更新测试用例
- **验收**：所有测试通过

---

## 执行顺序

```
Task 1 (State) → Task 2 (Tools) → Task 3 (Nodes) → Task 4 (Graph)
                                                          ↓
Task 8 (测试) ← Task 7 (清理) ← Task 6 (routes) ← Task 5 (Checkpointer)
```

---

## 进度追踪

| Task | 状态 | 开始时间 | 完成时间 |
|------|------|---------|---------|
| 1. 定义 State | ✅ 完成 | 2026-06-02 | 2026-06-02 |
| 2. 包装 Tools | ✅ 完成 | 2026-06-02 | 2026-06-02 |
| 3. 实现 Nodes | ✅ 完成 | 2026-06-02 | 2026-06-02 |
| 4. 组装 Graph | ✅ 完成 | 2026-06-02 | 2026-06-02 |
| 5. 接入 Checkpointer | ✅ 完成 | 2026-06-02 | 2026-06-02 |
| 6. 改造 routes.ts | ✅ 完成 | 2026-06-02 | 2026-06-02 |
| 7. 清理旧代码 | ✅ 完成 | 2026-06-02 | 2026-06-02 |
| 8. 更新测试 | ✅ 完成 | 2026-06-02 | 2026-06-02 |
