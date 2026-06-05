# LangChain / LangGraph 最佳实践

## 一、核心概念

### 1.1 LangChain 核心组件

| 组件 | 作用 | 最佳实践 |
|------|------|----------|
| **Model** | LLM 调用封装 | 使用 `ChatOpenAI` 而非原生 SDK，统一接口 |
| **Prompt** | 提示词模板 | 使用 `ChatPromptTemplate`，支持变量注入 |
| **Chain** | 链式调用 | 简单任务用 LCEL（`\|` 管道语法） |
| **Agent** | 自主决策 | 复杂任务用 LangGraph 状态图 |
| **Tool** | 工具调用 | 统一返回 `string` 或 `ToolMessage` |
| **Memory** | 状态持久化 | 使用 Checkpointer，避免双重存储 |

### 1.2 LangGraph 核心概念

| 概念 | 说明 | 使用场景 |
|------|------|----------|
| **StateGraph** | 状态图定义 | 多步骤、有分支的任务流 |
| **Annotation** | 状态类型定义 | 类型安全的状态管理 |
| **Node** | 节点函数 | 执行具体逻辑 |
| **Edge** | 边 | 节点间流转 |
| **Conditional Edge** | 条件边 | 根据状态动态路由 |
| **ToolNode** | 工具节点 | 自动执行工具调用 |
| **Checkpointer** | 状态持久化 | 支持中断恢复、时间旅行 |

---

## 二、工具系统最佳实践

### 2.1 工具返回格式

```typescript
// ✅ 推荐：返回 string
const myTool = tool(
  async (input) => {
    const result = await doSomething(input)
    return JSON.stringify(result)  // 字符串
  },
  { name: 'my_tool', description: '...', schema: z.object({...}) }
)

// ✅ 推荐：返回 ToolMessage
const myTool = tool(
  async (input) => {
    const result = await doSomething(input)
    return new ToolMessage({
      content: JSON.stringify(result),
      tool_call_id: '...',
      name: 'my_tool'
    })
  },
  { ... }
)

// ❌ 避免：返回 object（会被自动序列化，格式不可控）
const myTool = tool(
  async (input) => {
    return { success: true, data: {...} }  // 不推荐
  },
  { ... }
)
```

### 2.2 工具命名规范

```typescript
// ✅ 推荐：snake_case，动词_名词
'search_schemas'
'get_schema_detail'
'validate_schema'
'update_schema'

// ❌ 避免：驼峰或不一致
'searchSchemas'
'SearchSchemas'
'findSchema'
```

### 2.3 工具描述规范

```typescript
const searchTool = tool(
  async (input) => { ... },
  {
    name: 'search_schemas',
    description: '搜索表单 Schema 列表。支持按关键词、类型筛选。返回匹配的 Schema 摘要列表。',
    //                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //                      清晰说明：做什么、参数含义、返回内容
    schema: z.object({
      keyword: z.string().describe('搜索关键词，匹配 Schema 名称'),
      type: z.enum(['form', 'list']).describe('Schema 类型：form=表单，list=列表'),
      limit: z.number().default(10).describe('返回数量上限'),
    }),
  }
)
```

### 2.4 避免工具名冲突

```typescript
// ❌ 问题：多个工具同名
// editorTools.ts
export const searchSchemas = tool(..., { name: 'search_schemas' })

// flowTools.ts
export const searchSchemas = tool(..., { name: 'search_schemas' })  // 冲突！

// ✅ 解决：使用命名前缀或合并
// 方案 1：命名前缀
export const editorSearchSchemas = tool(..., { name: 'editor_search_schemas' })
export const flowSearchSchemas = tool(..., { name: 'flow_search_schemas' })

// 方案 2：合并为一个工具，通过参数区分
export const searchSchemas = tool(
  async ({ source, keyword, type, limit }) => {
    if (source === 'flow') {
      // 流程专用搜索逻辑
    } else {
      // 编辑器搜索逻辑
    }
  },
  {
    name: 'search_schemas',
    schema: z.object({
      source: z.enum(['editor', 'flow']).describe('搜索来源'),
      keyword: z.string(),
      ...
    }),
  }
)
```

---

## 三、状态管理最佳实践

### 3.1 Annotation 定义

```typescript
import { Annotation, MessagesAnnotation } from '@langchain/langgraph'

// ✅ 推荐：明确 reducer 语义
const StateAnnotation = Annotation.Root({
  // 继承消息处理
  ...MessagesAnnotation.spec,

  // 自定义字段：last-write-wins（默认）
  currentAgent: Annotation<string>,

  // 自定义字段：累加
  toolResults: Annotation<ToolResult[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // 自定义字段：合并
  metadata: Annotation<Record<string, unknown>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
})
```

### 3.2 避免状态膨胀

```typescript
// ❌ 问题：状态字段过多（16+ 个）
const StateAnnotation = Annotation.Root({
  messages, sessionId, conversationId, currentAgent, context,
  taskType, needsTool, toolResults, error, clarificationRequest,
  clarificationOptions, taskChain, currentStepIndex, intermediateResults,
  preferences, historySummary, currentVersion, collaborationRequest
  // 太多字段，难以维护
})

// ✅ 推荐：使用嵌套对象分组
const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>,

  // 会话信息
  session: Annotation<{
    id: string
    conversationId: string
    currentAgent: string
  }>,

  // 任务状态
  task: Annotation<{
    type: string
    chain: TaskStep[]
    currentStepIndex: number
    intermediateResults: Record<string, unknown>[]
  }>,

  // 工具状态
  tools: Annotation<{
    needsTool: boolean
    results: ToolResult[]
  }>,

  // 用户交互
  interaction: Annotation<{
    clarificationRequest: string | null
    clarificationOptions: string[]
    preferences: Record<string, unknown>
  }>,
})
```

---

## 四、图结构最佳实践

### 4.1 单一职责原则

```typescript
// ❌ 问题：thinker 节点职责过重
async function thinkerNode(state) {
  // 1. 任务链管理
  // 2. LLM 调用
  // 3. JSON 解析
  // 4. 关键词降级
  // 5. 协作请求处理
}

// ✅ 推荐：拆分为独立节点
async function routerNode(state) {
  // 路由决策（显式模式 or LLM 分析）
}

async function taskChainNode(state) {
  // 任务链推进
}

async function collaborationNode(state) {
  // 协作请求处理
}
```

### 4.2 条件边模式

```typescript
// ✅ 推荐：清晰的条件边定义
builder.addConditionalEdges(
  'thinker',
  (state) => {
    // 显式模式
    if (state.context.mode) return state.context.mode

    // 任务链模式
    if (state.task.chain.length > 0) {
      const currentStep = state.task.chain[state.task.currentStepIndex]
      return currentStep.target
    }

    // LLM 路由结果
    return state.currentAgent
  },
  {
    editor: 'editor',
    flow: 'flow',
    page: 'page',
    general: 'general',
  }
)
```

### 4.3 错误处理模式

```typescript
// ✅ 推荐：节点内 try-catch + 状态标记
async function agentNode(state) {
  try {
    const result = await llm.invoke(state.messages)
    return { messages: [result] }
  } catch (error) {
    return {
      error: {
        type: 'LLM_ERROR',
        message: error.message,
        recoverable: true,
      }
    }
  }
}

// 条件边根据 error 状态路由
builder.addConditionalEdges(
  'agent',
  (state) => state.error?.recoverable ? 'retry' : 'error_handler'
)
```

---

## 五、SSE 流式响应最佳实践

### 5.1 事件类型设计

```typescript
// ✅ 推荐：明确的事件类型 + 统一结构
interface SSEEvent {
  type: 'thinking' | 'text' | 'tool_call' | 'tool_error' | 'error' | 'done'
  data: {
    content?: string
    agent?: string
    toolName?: string
    error?: string
    timestamp: number
  }
}
```

### 5.2 流式处理模式

```typescript
// ✅ 推荐：使用 streamEvents + 事件过滤
const stream = graph.streamEvents(input, { version: 'v2' })

for await (const event of stream) {
  if (event.event === 'on_chat_model_stream') {
    // LLM token 流
    send({ type: 'text', content: event.data.chunk.content })
  } else if (event.event === 'on_tool_start') {
    // 工具开始
    send({ type: 'tool_call', phase: 'calling', tools: [...] })
  } else if (event.event === 'on_tool_end') {
    // 工具结束
    send({ type: 'tool_call', phase: 'result', tools: [...] })
  }
}
```

### 5.3 心跳机制

```typescript
// ✅ 推荐：定期心跳保活
const heartbeat = setInterval(() => {
  res.write(':heartbeat\n\n')
}, 15000)

try {
  // 流处理
} finally {
  clearInterval(heartbeat)
}
```

---

## 六、Checkpointer 最佳实践

### 6.1 避免双重存储

```typescript
// ❌ 问题：对话消息双重存储
// conversationService: AIConversation 集合
// checkpointMongo: ai_checkpoints 集合
// 两者存储重叠数据，格式不同

// ✅ 推荐：统一使用 Checkpointer
// 方案 1：只用 Checkpointer，废弃 conversationService
// 方案 2：只用 conversationService，不用 Checkpointer（需要自己实现状态恢复）
// 方案 3：明确分工
//   - Checkpointer: LangGraph 状态（用于中断恢复）
//   - conversationService: 业务数据（对话列表、版本历史）
```

### 6.2 Checkpointer 配置

```typescript
// ✅ 推荐：明确的 thread_id 管理
const config = {
  configurable: {
    thread_id: conversationId,  // 对话级
    // checkpoint_id: 'xxx',     // 可选：指定 checkpoint
  }
}

// 保存状态
await graph.updateState(config, { messages: [...] })

// 恢复执行
const result = await graph.invoke(null, config)
```

---

## 七、Human-in-the-Loop 最佳实践

### 7.1 Interrupt 机制

```typescript
// ✅ 推荐：写操作前 interrupt 确认
const updateTool = tool(
  async (input) => {
    // 执行前 interrupt
    const confirmed = await interrupt({
      type: 'confirmation',
      message: `确认更新 Schema "${input.name}"？`,
      data: input,
    })

    if (!confirmed) {
      return '用户取消操作'
    }

    // 执行更新
    const result = await updateSchema(input)
    return JSON.stringify(result)
  },
  { name: 'update_schema', ... }
)
```

### 7.2 人工审批流程

```typescript
// ✅ 推荐：敏感操作需要审批
builder.addNode('approval', async (state) => {
  const { action, data } = state.pendingApproval

  // 等待人工审批（通过 interrupt 或外部 API）
  const approved = await waitForApproval(action, data)

  if (approved) {
    return { approved: true }
  } else {
    return { approved: false, reason: '用户拒绝' }
  }
})

builder.addEdge('approval', (state) =>
  state.approved ? 'execute' : 'cancel'
)
```

---

## 八、性能优化

### 8.1 LLM 实例复用

```typescript
// ❌ 问题：每次调用新建实例
async function agentNode(state) {
  const llm = new ChatOpenAI({ modelName: 'gpt-4' })  // 每次新建
  return llm.invoke(state.messages)
}

// ✅ 推荐：复用实例
const llm = new ChatOpenAI({ modelName: 'gpt-4' })  // 模块级

async function agentNode(state) {
  return llm.invoke(state.messages)
}

// ✅ 推荐：或使用工厂函数缓存
const getLLM = (() => {
  const cache = new Map()
  return (model: string) => {
    if (!cache.has(model)) {
      cache.set(model, new ChatOpenAI({ modelName: model }))
    }
    return cache.get(model)
  }
})()
```

### 8.2 工具执行优化

```typescript
// ✅ 推荐：并行执行独立工具
// LangGraph ToolNode 默认串行执行工具
// 如果工具之间无依赖，可以自定义并行执行

const toolNode = new ToolNode(tools)
toolNode.lc_kwargs = { maxConcurrency: 3 }  // 并发数
```

### 8.3 消息裁剪

```typescript
// ✅ 推荐：限制消息历史长度
function trimMessages(messages: BaseMessage[], maxTokens: number) {
  // 保留系统消息
  const systemMessages = messages.filter(m => m._getType() === 'system')

  // 从最新消息开始，保留到 token 限制
  const recentMessages = []
  let tokenCount = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const tokens = countTokens(msg.content)
    if (tokenCount + tokens > maxTokens) break
    recentMessages.unshift(msg)
    tokenCount += tokens
  }

  return [...systemMessages, ...recentMessages]
}
```

---

## 九、调试与监控

### 9.1 日志规范

```typescript
// ✅ 推荐：结构化日志
logger.info('Agent node executed', {
  node: 'editor',
  agent: state.currentAgent,
  messageCount: state.messages.length,
  hasToolCalls: state.messages.some(m => m.tool_calls?.length > 0),
  duration: Date.now() - startTime,
})
```

### 9.2 追踪集成

```typescript
// ✅ 推荐：集成 LangSmith 追踪
process.env.LANGSMITH_API_KEY = 'xxx'
process.env.LANGSMITH_PROJECT = 'schema-form-ai'

// 自动追踪所有 LangChain 调用
const llm = new ChatOpenAI({
  modelName: 'gpt-4',
  callbacks: [new LangChainTracer()],
})
```

---

## 十、常见问题解决

### 10.1 INVALID_TOOL_RESULTS 错误

**原因**：工具返回格式不符合 LangGraph 期望

**解决方案**：
```typescript
// ✅ 返回 string
return JSON.stringify({ success: true, data: result })

// ✅ 或返回 ToolMessage
return new ToolMessage({
  content: JSON.stringify(result),
  tool_call_id: '...',
  name: 'my_tool',
})
```

### 10.2 工具调用无限循环

**原因**：工具返回结果导致 LLM 再次调用工具

**解决方案**：
```typescript
// ✅ 在 prompt 中明确工具使用规则
const systemPrompt = `
使用工具后，根据结果直接回复用户，不要重复调用相同工具。
如果工具返回错误，向用户解释错误原因，不要重试。
`

// ✅ 限制工具调用次数
const config = {
  recursionLimit: 10,  // 最大递归次数
}
```

### 10.3 状态丢失

**原因**：Checkpointer 配置错误或 thread_id 不一致

**解决方案**：
```typescript
// ✅ 确保 thread_id 一致
const config = {
  configurable: {
    thread_id: conversationId,  // 必须一致
  }
}

// ✅ 检查 Checkpointer 连接
const checkpointer = await createCheckpointer()
console.log('Checkpointer ready:', !!checkpointer)
```

---

## 参考资源

- [LangChain JS 官方文档](https://js.langchain.com/)
- [LangGraph JS 官方文档](https://langchain-ai.github.io/langgraphjs/)
- [LangSmith 追踪平台](https://smith.langchain.com/)
