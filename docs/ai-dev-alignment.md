# AI 项目服务端与前端分工对齐文档

> 更新日期：2026/06/04
> 服务端范围：packages/server/src/ai（31 个文件）
> 前端范围：packages/ai-app
> 进度：服务端 3/12 完成 | 前端 5/7 完成

---

## 一、代码结构概览

```
packages/server/src/ai/
├── routes.ts              (582行) — SSE 流式 chat + publish + CRUD
├── graph/
│   ├── state.ts           (199行) — LangGraph Annotation 状态定义
│   ├── graph.ts           (573行) — thinker/router/general/summarizer + 图组装
│   ├── checkpointer.ts    (16行)  — MemorySaver 单例 ← 问题点
│   ├── agentBase.ts       (202行) — OpenAI client、消息构建、重试、解析
│   ├── editorAgent.ts     (135行) — Editor Agent 节点
│   ├── flowAgent.ts       (143行) — Flow Agent 节点
│   └── router.ts          (148行) — Router 分类节点（当前未在图中使用）
├── tools/
│   ├── editorTools.ts     (438行) — 6 个编辑器工具
│   ├── flowTools.ts       (352行) — 6 个流程工具
│   ├── collaborationTools.ts (63行) — 协作工具
│   ├── schemaGenerator.ts (120行) — Schema 生成封装
│   └── allTools.ts        (54行)  — 工具合并
├── services/
│   └── conversationService.ts (260行) — MongoDB 持久化
└── schemas/
    └── aiSchemas.ts       (43行)  — Zod 校验
```

---

## 二、任务分工总览

### 2.1 服务端任务清单

| 序号 | 任务 | 优先级 | 工作量 | 前端依赖 |
|------|------|--------|--------|----------|
| 1 | 协作请求状态传递断裂 | Critical | 2-3 小时 | 无 |
| 2 | MemorySaver 替换 | Critical | 4-6 小时 | 无 |
| 3 | thinking 事件 fallback | High | 1-2 小时 | 无 |
| 4 | 工具结果 ID 匹配 | High | 1 小时 | 无 |
| 5 | 工具错误处理 | High | 1-2 小时 | 前端需配合 |
| 6 | 伪语义搜索重命名 | High | 0.5 小时 | 无 |
| 7 | 流结束 DONE 保证 | Medium | 1 小时 | 前端需配合 |
| 8 | thinker 静默失败日志 | Medium | 0.5 小时 | 无 |
| 9 | 协作上下文传递 | Medium | 2-3 小时 | 无 |
| 10 | API Key 校验 | Medium | 0.5-1 小时 | 无 |
| 11 | 消息历史截断优化 | Medium | 1-2 小时 | 无 |
| 12 | RAG 实现 | Large | 8-16 小时 | 无 |

**服务端总工作量：23-38 小时（约 3-5 天）**

### 2.2 前端任务清单

| 序号 | 任务 | 优先级 | 工作量 | 服务端依赖 |
|------|------|--------|--------|------------|
| 1 | SSE 解析丢帧修复 | Critical | 0.5 天 | 无 |
| 2 | 流式渲染防抖 | High | 0.5 天 | 无 |
| 3 | 流结束处理优化 | Medium | 0.5 天 | Task 7 |
| 4 | tool_error 事件处理 | Medium | 0.5 天 | Task 5 |
| 5 | ChatContext 字段设置 | Medium | 2 天 | 无 |
| 6 | 空状态引导 prompt | High | 1 天 | 无 |
| 7 | Schema 简易渲染预览 | High | 2 天 | 无 |

**前端总工作量：7 天**

---

## 三、详细任务分析（服务端）

### Task 1: 协作请求状态传递断裂 (Critical)

**现状**:
```
collaborationTools.ts → requestCollaborationTool 返回协作请求
         ↓
graph.ts → afterTools() 检测 tool_calls 中的协作请求
         ↓
graph.ts → thinkerNode() 从 lastMessage.tool_calls 提取协作信息
```

**问题**: ToolNode 执行完工具后，lastMessage 是 ToolMessage（工具结果），不是 AIMessage（tool_calls）。协作请求检测永远不会触发。

**修复方案**:
```typescript
// 方案：在 state 中添加 collaborationRequest 字段
interface GraphState {
  // ...
  collaborationRequest?: {
    targetAgent: string
    description: string
    context: Record<string, unknown>
  }
}

// afterTools 中设置
if (toolName === 'request_collaboration') {
  return {
    ...state,
    collaborationRequest: {
      targetAgent: result.targetAgent,
      description: result.description,
      context: result.context
    }
  }
}

// thinkerNode 中读取并清除
if (state.collaborationRequest) {
  const { targetAgent, description, context } = state.collaborationRequest
  // 处理协作请求
  return { ...state, collaborationRequest: null, nextAgent: targetAgent }
}
```

**工作量**: 2-3 小时
**与前端依赖**: 无。前端已能处理 `agent_switch` + `collaboration: true` 事件。

---

### Task 2: MemorySaver 替换 (Critical)

**现状**: `checkpointer.ts` 第 13 行 `new MemorySaver()` 是进程内存，重启丢失。

**修复方案**:
```typescript
// 选项 A：使用官方包
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb'
const checkpointer = new MongoDBSaver({ client: mongoClient })

// 选项 B：自定义实现（推荐）
// packages/server/src/ai/models/checkpoint.ts
export class MongoDbCheckpointer implements BaseCheckpointSaver {
  async get(config: RunnableConfig): Promise<Checkpoint | null> {
    // 从 ai_checkpoints collection 读取
  }
  
  async put(config: RunnableConfig, checkpoint: Checkpoint): Promise<void> {
    // 写入 ai_checkpoints collection
  }
}
```

**工作量**: 4-6 小时
**与前端依赖**: 无。

---

### Task 3: thinking 事件 fallback (High)

**现状**: routes.ts 第 244 行依赖 DeepSeek 私有字段 `chunk?.additional_kwargs?.reasoning_content`。

**修复方案**:
```typescript
// 添加 fallback 逻辑
const reasoningContent = chunk?.additional_kwargs?.reasoning_content
  || chunk?.reasoning_content
  || (typeof chunk?.content === 'string' && chunk.content.includes('<think>') 
      ? extractThinkContent(chunk.content) 
      : null)

if (reasoningContent) {
  send({ type: 'thinking', content: reasoningContent })
} else if (chunk?.content) {
  // 记录 warning，但不阻塞流
  console.warn('[AI] No thinking content found in chunk')
}
```

**工作量**: 1-2 小时
**与前端依赖**: 无。接口不变。

---

### Task 4: 工具结果 ID 匹配 (High)

**现状**: routes.ts 第 308 行用名称匹配工具结果。

**修复方案**:
```typescript
// 改为用 run_id 精确匹配
const entry = toolCallRegistry.find(
  (t) => t.id === event.run_id && !t.result
)
```

**工作量**: 1 小时
**与前端依赖**: 无。

---

### Task 5: 工具错误处理 (High)

**现状**: 工具执行失败时，前端看不到错误信息。

**修复方案**:
```typescript
// 在 on_tool_end 中检查错误
if (event.data?.output?.includes('Error:') || event.data?.output?.error) {
  send({
    type: 'tool_error',
    toolName: event.name,
    error: event.data.output
  })
}

// 在 toolCallRegistry 中记录 error
entry.error = event.data?.output
```

**工作量**: 1-2 小时
**与前端依赖**: 前端需新增对 `tool_error` 事件类型的处理。

---

### Task 6: 伪语义搜索重命名 (High)

**现状**: `semanticSearchSchemasTool` 使用 Jaccard 相似度，不是真正的语义搜索。

**修复方案**:
```typescript
// 重命名工具
export const fuzzySearchSchemasTool = tool(
  async ({ query, limit }) => {
    // ... 现有逻辑
  },
  {
    name: 'fuzzy_search_schemas',
    description: '基于关键词模糊搜索 Schema（非语义搜索）',
    // ...
  }
)
```

**工作量**: 0.5 小时
**与前端依赖**: 无。

---

### Task 7: 流结束 DONE 保证 (Medium)

**现状**: 如果 graph.streamEvents 抛异常，catch 块发的是 `error` 不是 `done`。

**修复方案**:
```typescript
let doneSent = false

try {
  for await (const event of graph.streamEvents(...)) {
    // 处理事件
  }
} catch (error) {
  send({ type: 'error', error: error.message })
} finally {
  if (!doneSent) {
    send({ type: 'done', conversationId: convo._id })
    doneSent = true
  }
}
```

**工作量**: 1 小时
**与前端依赖**: 前端需处理 error+done 组合场景。

---

### Task 8: thinker 静默失败日志 (Medium)

**现状**: graph.ts 第 277 行 `catch {}` 静默降级。

**修复方案**:
```typescript
catch (error) {
  console.warn('[AI] Thinker node failed, falling back to keyword routing:', error)
  const agent = routeByKeyword(state)
  return { ...state, nextAgent: agent }
}
```

**工作量**: 0.5 小时
**与前端依赖**: 无。

---

### Task 9: 协作上下文传递 (Medium)

**现状**: `collaborationTools.ts` 的 `context` 字段没有被使用。

**修复方案**:
```typescript
// 定义结构化 schema
const collaborationContextSchema = z.object({
  schemaId: z.string().optional(),
  flowId: z.string().optional(),
  currentStep: z.string().optional(),
  relevantFields: z.array(z.string()).optional()
})

// 在 thinker 处理协作请求时，将 context 写入 state
if (state.collaborationRequest) {
  const { targetAgent, description, context } = state.collaborationRequest
  // 将 context 合并到 state
  return {
    ...state,
    collaborationRequest: null,
    collaborationContext: context,
    nextAgent: targetAgent
  }
}
```

**工作量**: 2-3 小时
**与前端依赖**: 无。

---

### Task 10: API Key 校验 (Medium)

**现状**: `process.env.DEEPSEEK_API_KEY` 在 5 个 agent 节点中独立读取。

**修复方案**:
```typescript
// 在 agentBase.ts 中集中校验
const API_KEY = process.env.DEEPSEEK_API_KEY
if (!API_KEY) {
  throw new Error('DEEPSEEK_API_KEY environment variable is required')
}

// 各 agent 节点改为调用 getClient()
const client = getClient()  // 使用缓存的 key
```

**工作量**: 0.5-1 小时
**与前端依赖**: 无。

---

### Task 11: 消息历史截断优化 (Medium)

**现状**: editorAgent 和 flowAgent 独立实现了截断逻辑，按条数截断。

**修复方案**:
```typescript
// 统一到 agentBase.ts
export function truncateMessages(messages: BaseMessage[], maxTurns = 3): BaseMessage[] {
  const turns: BaseMessage[][] = []
  let currentTurn: BaseMessage[] = []
  
  for (const msg of messages) {
    if (msg instanceof HumanMessage && currentTurn.length > 0) {
      turns.push(currentTurn)
      currentTurn = []
    }
    currentTurn.push(msg)
  }
  if (currentTurn.length > 0) turns.push(currentTurn)
  
  return turns.slice(-maxTurns).flat()
}

// editorAgent/flowAgent 改为调用统一函数
const truncatedHistory = truncateMessages(state.messages.slice(0, -1))
```

**工作量**: 1-2 小时
**与前端依赖**: 无。

---

### Task 12: RAG 实现 (Large)

**现状**: 不存在。当前的"语义搜索"是 Jaccard token 匹配。

**修复方案**:
```
用户消息
  ↓
Embedding 模型 (DeepSeek / @xenova/transformers)
  ↓
向量检索 (MongoDB Atlas Vector Search / Chroma)
  ↓
Top-K 结果注入 LLM context
  ↓
LLM 生成响应
```

**技术选型**:
| 组件 | 轻量方案 | 生产方案 |
|------|----------|----------|
| Embedding | @xenova/transformers | DeepSeek Embedding API |
| 向量存储 | Chroma (单文件) | MongoDB Atlas Vector Search |

**工作量**: 8-16 小时
**与前端依赖**: 无。但 RAG 结果格式变化可能影响前端展示。

---

## 四、需要与前端协调的接口变更

### 4.1 新增 SSE 事件类型

| 事件类型 | 格式 | 说明 | 前端动作 |
|----------|------|------|----------|
| `tool_error` | `{ type: 'tool_error', toolName: string, error: string }` | 工具执行失败 | 新增错误渲染 |
| `done` (扩展) | `{ type: 'done', conversationId: string, error?: boolean }` | 流结束（带错误标记） | 处理 error+done 组合 |

### 4.2 现有 SSE 事件格式（不变）

| 事件类型 | 格式 | 说明 |
|----------|------|------|
| `thinking` | `{ type: 'thinking', content: string }` | thinking 内容 |
| `text` | `{ type: 'text', content: string }` | 响应文本 |
| `tool_call` | `{ type: 'tool_call', toolName: string, phase: 'calling' | 'result', result?: any }` | 工具调用 |
| `agent_switch` | `{ type: 'agent_switch', agent: string, collaboration?: boolean, description?: string }` | 智能体切换 |
| `task_chain` | `{ type: 'task_chain', steps: TaskStep[] }` | 任务链进度 |
| `done` | `{ type: 'done', conversationId: string }` | 流结束 |
| `error` | `{ type: 'error', error: string }` | 错误 |

### 4.3 接口变更原则

1. **无破坏性变更**：所有现有 SSE 事件格式保持兼容
2. **新增事件是增量**：`tool_error` 是新增类型，不影响现有逻辑
3. **扩展字段可选**：`done` 事件的 `error` 字段是可选的，前端需做兼容处理

---

## 五、分工边界定义

### 5.1 核心原则

> **服务端是 SSE 事件的生产者，前端是消费者。接口契约以 SSE 事件类型为边界。**

### 5.2 详细分工

| 边界 | 服务端负责 | 前端(ai-app)负责 |
|------|------------|------------------|
| **SSE 协议** | 事件格式正确性、DONE 保证 | 解析防抖、丢帧重连 |
| **流式内容** | token 发送频率 | 渲染节奏、缓冲区管理 |
| **错误** | 错误事件的产生和分类 | 错误 UI 展示和用户提示 |
| **状态** | 图状态持久化（MemorySaver → MongoDB） | 会话状态恢复（conversation list） |
| **工具** | 工具执行、结果匹配、错误传播 | 工具调用状态展示（loading/error） |
| **协作** | 协作请求的产生和路由 | 协作状态的 UI 标签和过渡动画 |
| **搜索** | 搜索算法实现（token/RAG） | 搜索结果展示格式 |
| **配置** | API Key 校验、模型配置 | ChatContext 设置（preferences/historySummary） |

### 5.3 不重叠区域

| 服务端不做 | 前端不做 |
|------------|----------|
| 不做前端渲染优化 | 不做工具执行逻辑 |
| 不做 UI 防抖 | 不做 SSE 事件格式化 |
| 不做错误 UI 展示 | 不做图状态持久化 |
| 不做 ChatContext 数据收集 | 不做搜索算法实现 |

---

## 六、执行计划

### Phase 1: Critical 修复（1-2 天）

**服务端**:
- [x] Task 1: 协作请求状态传递断裂 (2-3 小时) — commit e62d47d
- [x] Task 2: MemorySaver 替换 (4-6 小时) — commit 7a1ffde

**前端**:
- [ ] SSE 解析丢帧修复 (0.5 天)

**协调点**: 无

---

### Phase 2: High 修复（2-3 天）

**服务端**:
- [x] Task 3: thinking 事件 fallback (1-2 小时) — commit 364be96
- [ ] Task 4: 工具结果 ID 匹配 (1 小时)
- [ ] Task 5: 工具错误处理 (1-2 小时)
- [ ] Task 6: 伪语义搜索重命名 (0.5 小时)

**前端**:
- [x] 流式渲染防抖 (0.5 天) — commit 32cc71e
- [ ] tool_error 事件处理 (0.5 天)
- [x] 空状态引导 prompt (1 天) — commit b1f53ca

**协调点**:
- Task 5 完成后，前端需新增 `tool_error` 事件处理

---

### Phase 3: Medium 修复（1-2 天）

**服务端**:
- [ ] Task 7: 流结束 DONE 保证 (1 小时)
- [ ] Task 8: thinker 静默失败日志 (0.5 小时)
- [ ] Task 9: 协作上下文传递 (2-3 小时)
- [ ] Task 10: API Key 校验 (0.5-1 小时)
- [ ] Task 11: 消息历史截断优化 (1-2 小时)

**前端**:
- [x] 流结束处理优化 (0.5 天) — commit 2cdf129
- [ ] ChatContext 字段设置 (2 天)
- [x] Schema 简易渲染预览 (2 天) — commit e6baf42

**协调点**:
- Task 7 完成后，前端需处理 error+done 组合场景

---

### Phase 4: RAG 实现（按需）

**服务端**:
- [ ] Task 12: RAG 实现 (8-16 小时)

**前端**:
- [ ] RAG 结果展示优化（如需要）

**协调点**:
- RAG 结果格式确定后，前端可能需要调整展示

---

## 七、风险提示

### 7.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| MemorySaver 替换后性能下降 | 高 | 先做性能测试，必要时添加缓存 |
| RAG 实现复杂度超预期 | 中 | 先做 POC 验证，再决定方案 |
| 工具错误处理影响 LLM 决策 | 中 | 错误信息要结构化，避免误导 LLM |

### 7.2 协调风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 接口变更未同步 | 高 | 变更前双方确认，保持向前兼容 |
| 任务依赖阻塞 | 中 | 优先完成无依赖任务 |
| 测试环境不一致 | 中 | 统一使用 Docker MongoDB 测试环境 |

---

## 八、验收标准

### 服务端验收

- [x] 协作请求可正确传递和处理 — commit e62d47d
- [x] 服务器重启后对话状态可恢复 — commit 7a1ffde
- [x] thinking 内容不再依赖私有字段 — commit 364be96
- [ ] 工具调用结果使用 run_id 精确匹配
- [ ] 工具执行失败返回结构化错误
- [ ] 语义搜索工具重命名为 fuzzy_search
- [ ] 流结束后一定发送 done 事件
- [ ] thinker 失败时有日志记录
- [ ] 协作上下文正确传递
- [ ] API Key 启动时校验
- [ ] 消息历史按轮次截断

### 前端验收

- [ ] SSE 解析不再静默丢帧
- [x] 流式文本渲染有防抖处理 — commit 32cc71e
- [x] 流结束后对话列表正确刷新 — commit 2cdf129
- [ ] tool_error 事件正确渲染
- [x] 空对话状态显示引导 prompt — commit b1f53ca
- [x] Schema 生成后可在预览面板渲染 — commit e6baf42
- [ ] ChatContext 的 preferences 和 historySummary 可正确设置

### 联合验收

- [ ] 端到端对话流程正常
- [ ] 多智能体协作正常工作
- [ ] 工具调用状态正确展示
- [ ] 错误场景用户感知正常
