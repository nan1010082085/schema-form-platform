# Agent 详细说明

> AI 智能体的类型、职责、执行流程和配置

## 一、Agent 类型

### 1.1 Router Agent（路由器）

**职责**：分析用户意图，路由到正确的 Agent

**路由逻辑**：
```
用户消息
    │
    ▼
┌─────────────────────────────────────────────────┐
│                  Router Agent                    │
├─────────────────────────────────────────────────┤
│ 1. 分析用户意图                                  │
│ 2. 检查 context.source（用户选择的模式）         │
│ 3. 选择目标 Agent                                │
└─────────────────────────────────────────────────┘
    │
    ├── editor ──► 表单相关任务
    ├── flow   ──► 流程相关任务
    ├── page   ──► 页面相关任务
    └── general ──► 通用问答
```

**路由规则**：
- 如果 `context.source === 'editor'`，直接路由到 Editor Agent
- 如果 `context.source === 'flow'`，直接路由到 Flow Agent
- 否则，根据用户消息内容智能路由

### 1.2 Editor Agent（表单编辑器）

**职责**：生成/编辑表单 Schema

**能力**：
- 从自然语言生成 Widget Schema JSON
- 搜索已有表单
- 验证 Schema 结构
- 更新现有表单
- 绑定表单到流程节点

**System Prompt 构建**：
```typescript
// packages/ai/shared/promptBuilder.ts
buildEditorSystemPrompt(metadata)
// - 注入 Widget 元数据
// - 注入工具使用说明
// - 注入 Schema 结构规范
```

### 1.3 Flow Agent（流程编辑器）

**职责**：生成/编辑流程

**能力**：
- 从自然语言生成 BPMN 流程
- 搜索已有流程
- 验证流程结构
- 更新现有流程
- 管理流程节点和边

### 1.4 Page Agent（页面编辑器）

**职责**：生成页面布局

**能力**：
- 从自然语言生成页面布局
- 管理页面组件
- 配置页面样式

### 1.5 General Agent（通用助手）

**职责**：处理通用问答，不涉及具体业务

**场景**：
- 用户问与表单/流程无关的问题
- 需要解释概念或提供建议
- 闲聊或问候

---

## 二、Agent 执行流程

### 2.1 非流式执行

```typescript
// SDK: BaseAgent.execute()
const result = await agent.execute(
  '生成一个用户注册表单',
  { source: 'editor', schemaId: 'xxx' },
  historyMessages
)

// result 包含：
// - content: 最终响应文本
// - messages: 完整消息历史
// - toolCalls: 工具调用日志
// - truncated: 是否达到最大轮次
// - usage: Token 使用统计
```

**执行循环**：
```
for (round = 0; round < maxToolRounds; round++) {
  1. 调用 LLM
  2. 如果没有工具调用 → 返回结果
  3. 执行工具调用
  4. 将工具结果添加到消息历史
  5. 继续下一轮
}
```

### 2.2 流式执行

```typescript
// SDK: BaseAgent.executeStream()
const stream = agent.executeStream(
  '生成一个用户注册表单',
  { source: 'editor' },
  historyMessages
)

for await (const event of stream) {
  switch (event.type) {
    case 'text_delta':
      // 流式文本增量
      break
    case 'tool_call_start':
      // 工具调用开始
      break
    case 'tool_call_end':
      // 工具调用结束
      break
    case 'done':
      // 执行完成
      break
  }
}
```

---

## 三、Agent 配置

### 3.1 AgentConfig

```typescript
interface AgentConfig {
  // LLM 配置
  llm: LLMConfig

  // 系统提示词
  systemPrompt: string

  // 工具列表
  tools?: ToolDefinition[]

  // 最大工具调用轮次（默认 10）
  maxToolRounds?: number

  // 最大历史消息数（默认 20）
  maxHistoryMessages?: number
}
```

### 3.2 LLMConfig

```typescript
interface LLMConfig {
  // LLM 提供商
  provider: 'deepseek' | 'openai' | 'custom'

  // 模型名称
  model: string

  // API Key（可选，默认从环境变量读取）
  apiKey?: string

  // 自定义 Base URL（custom 模式必填）
  baseURL?: string

  // 温度参数
  temperature?: number

  // 最大 Token 数
  maxTokens?: number
}
```

### 3.3 配置示例

```typescript
const editorAgent = new EditorAgent({
  llm: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 8192,
  },
  systemPrompt: buildEditorSystemPrompt(metadata),
  tools: allTools,
  maxToolRounds: 10,
  maxHistoryMessages: 20,
})
```

---

## 四、LangGraph Agent（服务端）

### 4.1 Graph 结构

```typescript
// packages/server/src/ai/graph/graph.ts
const graph = new StateGraph(AgentStateAnnotation)
  .addNode('router', routerNode)
  .addNode('editor', editorNode)
  .addNode('flow', flowNode)
  .addNode('page', pageNode)
  .addNode('general', generalNode)
  .addNode('tools', toolNode)
  .addEdge('__start__', 'router')
  .addConditionalEdges('router', routeToAgent)
  .addConditionalEdges('editor', shouldCallTools)
  .addConditionalEdges('flow', shouldCallTools)
  .addConditionalEdges('page', shouldCallTools)
  .addEdge('tools', 'router')
  .compile()
```

### 4.2 Agent 节点实现

```typescript
// packages/server/src/ai/graph/editorAgent.ts
export async function editorNode(state: typeof AgentStateAnnotation.State) {
  // 1. 获取系统提示词
  const systemPrompt = await getEditorSystemPrompt()

  // 2. 构建上下文消息
  const contextMessage = buildContextMessage(state)

  // 3. 调用 LLM
  const response = await callLLMWithFallback({
    messages: [
      new SystemMessage(systemPrompt),
      ...state.messages,
      new HumanMessage(contextMessage),
    ],
    tools: editorTools,
  })

  // 4. 返回响应
  return { messages: [response] }
}
```

### 4.3 条件边函数

```typescript
// 路由到 Agent
function routeToAgent(state) {
  const lastMessage = state.messages[state.messages.length - 1]
  // 根据 Router 的输出决定路由
  return state.session.currentAgent
}

// 是否需要调用工具
function shouldCallTools(state) {
  const lastMessage = state.messages[state.messages.length - 1]
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return 'tools'
  }
  return '__end__'
}
```

---

## 五、Agent 协作

### 5.1 协作机制

通过 `request_collaboration` 工具实现 Agent 间协作：

```typescript
// Editor Agent 请求 Flow Agent 协作
const result = await toolRegistry.execute('request_collaboration', {
  targetAgent: 'flow',
  description: '需要创建一个审批流程',
  context: { schemaId: 'xxx' },
})
```

### 5.2 协作流程

```
Editor Agent
    │
    ├── 用户说"创建一个审批流程"
    │
    ▼
request_collaboration(targetAgent: 'flow')
    │
    ▼
Router Agent ──► Flow Agent
    │
    ▼
Flow Agent 处理任务
    │
    ▼
返回结果给 Editor Agent
```

### 5.3 agent_switch 事件

当 Agent 切换时，会发送 `agent_switch` 事件：

```typescript
{
  type: 'agent_switch',
  agent: 'flow',
  collaboration: true,
  description: '需要创建一个审批流程'
}
```

前端根据此事件更新 UI，显示实际执行的 Agent 标签。

---

## 六、Agent 状态

### 6.1 AgentStateAnnotation

```typescript
const AgentStateAnnotation = Annotation.Root({
  // 消息列表
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // 会话信息
  session: Annotation({
    id: string,
    conversationId: string,
    currentAgent: 'router' | 'editor' | 'flow' | 'page' | 'general',
  }),

  // 上下文信息
  context: Annotation({
    source: 'editor' | 'flow' | 'page' | 'standalone',
    schemaId?: string,
    flowId?: string,
    nodeId?: string,
    currentSchema?: Record<string, unknown>[],
    currentFlow?: { nodes, edges },
    turnCount: number,
  }),

  // 交互信息
  interaction: Annotation({
    preferences: Record<string, unknown>,
    historySummary: string,
    clarificationRequest: string | null,
    clarificationOptions: string[],
  }),

  // 任务信息
  task: Annotation({
    chain: Array<{ agent, description, status }>,
    currentStepIndex: number,
  }),
})
```

---

## 七、最佳实践

### 7.1 Agent 选择

- **表单相关**：使用 Editor Agent
- **流程相关**：使用 Flow Agent
- **页面布局**：使用 Page Agent
- **通用问答**：使用 General Agent
- **不确定**：让 Router Agent 自动路由

### 7.2 System Prompt 设计

- 明确 Agent 的职责和能力边界
- 提供清晰的工具使用说明
- 注入必要的上下文信息（Widget 元数据、Schema 规范等）
- 限制输出格式（JSON、Markdown 等）

### 7.3 工具调用

- 限制最大工具调用轮次（默认 10）
- 工具调用失败时提供清晰的错误信息
- 工具结果应该简洁明了，避免冗余信息
