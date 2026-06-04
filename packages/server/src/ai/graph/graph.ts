/**
 * AI Agent Graph — StateGraph assembly.
 *
 * Graph structure:
 *   START → thinker → router → (editor | flow | general) → allTools → ... → END
 *
 * - thinker: 输出思考过程（所有模式）
 * - router: 根据思考结果路由到对应智能体
 * - editor/flow: 执行任务，可能调用工具
 * - general: 通用回答
 */

import { StateGraph, END, START } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage, SystemMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { ROUTER_SYSTEM_PROMPT } from '@schema-form/shared-ai/promptBuilder'
import { AgentStateAnnotation } from './state.js'
import { editorAgentNode } from './editorAgent.js'
import { flowAgentNode } from './flowAgent.js'
import { allTools } from '../tools/allTools.js'
import { checkpointer } from './checkpointer.js'

// ────────────────────────────────────────────
// Tool nodes
// ────────────────────────────────────────────

const allToolNode = new ToolNode(allTools)

// ────────────────────────────────────────────
// Thinker node — 输出思考过程 + 路由决策
// ────────────────────────────────────────────

const THINKER_SYSTEM_PROMPT = `你是 schema-form-platform 的 AI 助手，基于 DeepSeek V4 Pro 模型驱动。

## 你的任务

1. **思考**：分析用户的需求，理解他们想要什么
2. **决策**：决定由哪些专家处理这个需求，以及执行顺序

## 可用的专家

### Editor 专家 — 表单/页面/UI 生成
- 表单设计（输入框、选择器、日期、上传等 18 种表单组件）
- 页面布局（卡片、标签页、多列布局等 8 种容器）
- 数据表格（数据表格、可编辑表格、搜索列表）
- 图表可视化（柱状图、折线图、饼图等 9 种图表）

### Flow 专家 — 流程/BPMN 生成
- 审批流程设计（单人审批、会签、或签）
- 工作流编排（节点、连线、分支、并行）
- BPMN 元素（开始/结束事件、用户任务、服务任务、网关）

### General — 通用回答
- 介绍平台能力
- 回答与平台无关的通用问题

## 输出格式

先用自然语言思考用户需求，然后输出 JSON 决策：

思考过程用自然语言描述...

\`\`\`json
{
  "target": "editor" | "flow" | "general" | "chain",
  "steps": [
    { "agent": "editor" | "flow", "description": "这一步做什么" }
  ]
}
\`\`\`

## 决策规则

1. **单一任务**：涉及表单/UI → "editor"，涉及流程/BPMN → "flow"
2. **通用问题**：介绍、能力询问、与平台无关的问题 → "general"
3. **联动任务**：同时涉及表单和流程 → "chain"，拆分为多步
   - 先生成表单（editor），再生成流程（flow）
   - 每步的 description 要清晰说明该步要做什么
4. **能力介绍**：用户问"你有什么能力"时 → "general"，介绍所有能力

## 示例

用户："做一个请假审批流程，需要申请表单"
\`\`\`json
{
  "target": "chain",
  "steps": [
    { "agent": "editor", "description": "生成请假申请表单" },
    { "agent": "flow", "description": "生成请假审批流程，关联表单" }
  ]
}
\`\`\`

用户："你有什么能力"
\`\`\`json
{ "target": "general" }
\`\`\``

async function thinkerNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required.')
  }

  const lastUserMessage = [...state.messages]
    .reverse()
    .find((m) => m.constructor.name === 'HumanMessage')

  const userContent = lastUserMessage
    ? (typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content))
    : '你好'

  // 显式模式：使用简化的 prompt 思考任务
  if (state.context.source === 'editor' || state.context.source === 'flow') {
    const agent = state.context.source
    const agentName = agent === 'editor' ? '表单/页面生成' : '流程/BPMN 生成'

    const model = new ChatOpenAI({
      model: 'deepseek-v4-pro',
      apiKey,
      configuration: { baseURL: 'https://api.deepseek.com' },
      temperature: 0,
      maxTokens: 2048,
      streaming: true,
    })

    const thinkPrompt = `你是${agentName}专家。用户的需求是：

${userContent}

请简要分析这个需求，说明你将如何实现。用 2-3 句话概括你的思路。`

    await model.invoke([
      new SystemMessage(thinkPrompt),
      new HumanMessage(userContent),
    ])

    return { currentAgent: agent, taskType: 'generate_simple', needsTool: true }
  }

  // Auto 模式：调用 LLM 思考 + 路由
  // 如果已有任务链，检查是否需要继续执行
  if (state.taskChain.length > 0) {
    const currentIndex = state.currentStepIndex

    // 检查是否有协作请求（由 afterToolsNode 从 AIMessage.tool_calls 中提取并写入 state）
    if (state.collaborationRequest) {
      const { targetAgent, description } = state.collaborationRequest

      // 将协作请求插入到任务链的下一个位置
      const newStep = {
        agent: targetAgent as 'editor' | 'flow',
        description: `协作：${description}`,
        status: 'pending' as const,
      }

      // 在当前位置插入新步骤
      const updatedChain = [
        ...state.taskChain.slice(0, currentIndex + 1),
        newStep,
        ...state.taskChain.slice(currentIndex + 1),
      ]

      // 标记当前步骤为 done
      updatedChain[currentIndex] = { ...updatedChain[currentIndex], status: 'done' as const }

      return {
        currentAgent: targetAgent as 'editor' | 'flow',
        taskType: 'generate_simple',
        needsTool: true,
        taskChain: updatedChain,
        currentStepIndex: currentIndex + 1,
        collaborationRequest: null, // 清除协作请求
      }
    }

    // 所有步骤已完成，进入总结
    if (currentIndex >= state.taskChain.length) {
      return { currentAgent: 'general', taskType: 'summarize', needsTool: false }
    }

    // 更新当前步骤状态为 running
    const updatedChain = state.taskChain.map((step, i) => {
      if (i === currentIndex) return { ...step, status: 'running' as const }
      if (i < currentIndex) return { ...step, status: 'done' as const }
      return step
    })

    const currentStep = state.taskChain[currentIndex]

    // 执行下一步
    return {
      currentAgent: currentStep.agent as 'editor' | 'flow',
      taskType: 'generate_simple',
      needsTool: true,
      taskChain: updatedChain,
      currentStepIndex: currentIndex,
    }
  }

  // 首次调用：分析需求，创建任务链
  const model = new ChatOpenAI({
    model: 'deepseek-v4-pro',
    apiKey,
    configuration: { baseURL: 'https://api.deepseek.com' },
    temperature: 0,
    maxTokens: 4096,
    streaming: true,
    modelKwargs: { response_format: { type: 'json_object' } },
  })

  try {
    const response = await model.invoke([
      new SystemMessage(THINKER_SYSTEM_PROMPT),
      new HumanMessage(userContent),
    ])

    const raw = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        target: string
        steps?: Array<{ agent: string; description: string }>
      }

      // 任务链：需要连续调用多个智能体
      if (parsed.target === 'chain' && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        const taskChain = parsed.steps.map((step) => ({
          agent: step.agent as 'editor' | 'flow',
          description: step.description,
          status: 'pending' as const,
        }))

        return {
          currentAgent: taskChain[0].agent,
          taskType: 'generate_simple',
          needsTool: true,
          taskChain,
          currentStepIndex: 0,
        }
      }

      // 单一任务
      if (parsed.target === 'flow') {
        return {
          currentAgent: 'flow',
          taskType: 'generate_simple',
          needsTool: true,
          taskChain: [{ agent: 'flow', description: '生成流程', status: 'pending' }],
          currentStepIndex: 0,
        }
      }
      if (parsed.target === 'general') {
        return { currentAgent: 'general', taskType: 'general', needsTool: false }
      }
    }

    // 默认使用 editor
    return {
      currentAgent: 'editor',
      taskType: 'generate_simple',
      needsTool: true,
      taskChain: [{ agent: 'editor', description: '生成表单', status: 'pending' }],
      currentStepIndex: 0,
    }
  } catch {
    // 降级：关键词匹配
    const lower = userContent.toLowerCase()
    const isFlow = ['流程', '审批', '节点', 'BPMN', 'workflow'].some(kw => lower.includes(kw.toLowerCase()))
    const agent = isFlow ? 'flow' : 'editor'
    return {
      currentAgent: agent,
      taskType: 'generate_simple',
      needsTool: true,
      taskChain: [{ agent, description: `生成${isFlow ? '流程' : '表单'}`, status: 'pending' }],
      currentStepIndex: 0,
    }
  }
}

// ────────────────────────────────────────────
// General agent node
// ────────────────────────────────────────────

const GENERAL_SYSTEM_PROMPT = `你是 schema-form-platform 的 AI 助手，基于 DeepSeek V4 Pro 模型驱动。

你有两个专家能力：

1. **Editor 专家**：表单/页面/UI 生成
   - 表单设计（输入框、选择器、日期、上传等 18 种表单组件）
   - 页面布局（卡片、标签页、多列布局等 8 种容器）
   - 数据表格（数据表格、可编辑表格、搜索列表）
   - 图表可视化（柱状图、折线图、饼图等 9 种图表）

2. **Flow 专家**：流程/BPMN 生成
   - 审批流程设计（单人审批、会签、或签）
   - 工作流编排（节点、连线、分支、并行）
   - BPMN 元素（开始/结束事件、用户任务、服务任务、网关）

## 关于你

- **模型**：DeepSeek V4 Pro（deepseek-v4-pro）
- **平台**：schema-form-platform — Schema 驱动的可视化自由布局设计器
- **能力**：根据自然语言描述自动生成表单 Schema JSON 和 BPMN 流程定义

请用友好、专业的语气回答用户问题。如果用户问你能做什么，引导他们描述具体需求。`

async function generalAgentNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required.')
  }

  const model = new ChatOpenAI({
    model: 'deepseek-v4-pro',
    apiKey,
    configuration: { baseURL: 'https://api.deepseek.com' },
    temperature: 0.7,
    maxTokens: 2048,
    streaming: true,
  })

  const lastUserMessage = [...state.messages]
    .reverse()
    .find((m) => m.constructor.name === 'HumanMessage')

  const userContent = lastUserMessage
    ? (typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content))
    : '你好'

  const messages = [
    new SystemMessage(GENERAL_SYSTEM_PROMPT),
    new HumanMessage(userContent),
  ]

  const response = await model.invoke(messages)

  return {
    messages: [response],
    currentAgent: 'general',
  }
}

// ────────────────────────────────────────────
// Summarizer node — 总结智能体执行结果
// ────────────────────────────────────────────

const SUMMARIZER_SYSTEM_PROMPT = `你是 schema-form-platform 的 AI 助手。你的任务是对专家智能体的执行结果进行总结。

## 你的职责

1. **回顾**：回顾用户的需求
2. **总结**：总结专家智能体的执行结果
3. **建议**：给出后续建议或注意事项

## 输出要求

- 以助手身份回答，不要以专家身份
- 简洁明了，突出重点
- 如果有多个步骤的结果，要整合总结
- 给出后续建议`

async function summarizerNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required.')
  }

  const lastUserMessage = [...state.messages]
    .reverse()
    .find((m) => m.constructor.name === 'HumanMessage')

  const userContent = lastUserMessage
    ? (typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content))
    : '你好'

  // 收集任务链的执行结果
  const taskResults = state.taskChain
    .filter((step) => step.status === 'done')
    .map((step) => `${step.agent} 专家完成了：${step.description}`)
    .join('\n')

  const model = new ChatOpenAI({
    model: 'deepseek-v4-pro',
    apiKey,
    configuration: { baseURL: 'https://api.deepseek.com' },
    temperature: 0.7,
    maxTokens: 2048,
    streaming: true,
  })

  const prompt = `${SUMMARIZER_SYSTEM_PROMPT}

## 用户需求
${userContent}

## 执行结果
${taskResults || '无'}

请以助手身份总结执行结果，并给出后续建议。`

  const response = await model.invoke([
    new SystemMessage(prompt),
    new HumanMessage(userContent),
  ])

  return {
    messages: [response],
    currentAgent: 'general',
  }
}

// ────────────────────────────────────────────
// Conditional edge functions
// ────────────────────────────────────────────

/**
 * After thinker, dispatch to the correct agent.
 */
export function routeAfterThinker(
  state: typeof AgentStateAnnotation.State,
): string {
  if (state.currentAgent === 'editor') return 'editor'
  if (state.currentAgent === 'flow') return 'flow'
  if (state.currentAgent === 'general') return 'general'
  return END
}

/**
 * After an agent node, decide next step:
 * - If tool_calls present → allTools
 * - If task chain has more steps → thinker (continue chain)
 * - If task chain complete → summarizer
 * - Otherwise → END
 */
export function afterAgent(
  state: typeof AgentStateAnnotation.State,
): string {
  const lastMessage = state.messages[state.messages.length - 1]

  // 检查是否需要调用工具
  if (
    lastMessage instanceof AIMessage &&
    lastMessage.tool_calls &&
    lastMessage.tool_calls.length > 0
  ) {
    return 'allTools'
  }

  // Auto 模式下，检查任务链
  if (state.context.source === 'standalone' && state.taskChain.length > 0) {
    const nextIndex = state.currentStepIndex + 1

    // 更新任务链状态：当前步骤标记为 done
    // 注意：这里只是返回路由决策，状态更新由 thinker 节点处理

    // 还有步骤需要执行
    if (nextIndex < state.taskChain.length) {
      return 'thinker'
    }

    // 所有步骤完成，进入总结
    return 'summarizer'
  }

  // 显式模式，直接结束
  return END
}

/**
 * Post-tool node — scans messages for collaboration request tool_calls
 * and writes `collaborationRequest` into state.
 *
 * This runs as an actual graph node (not a conditional edge function)
 * because conditional edges cannot modify state. After ToolNode executes
 * request_collaboration, the AIMessage with tool_calls is no longer the
 * last message — it sits behind the ToolMessages. This node iterates
 * all messages backwards to find it.
 */
async function afterToolsNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  // Scan messages backwards for the most recent AIMessage with tool_calls
  // that includes request_collaboration
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const msg = state.messages[i]
    if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
      const collaborationCall = msg.tool_calls.find(
        (tc) => tc.name === 'request_collaboration'
      )

      if (collaborationCall) {
        const targetAgent = collaborationCall.args.targetAgent as string
        if (targetAgent === 'editor' || targetAgent === 'flow') {
          return {
            collaborationRequest: {
              targetAgent: targetAgent as 'editor' | 'flow',
              description: collaborationCall.args.description as string,
              context: collaborationCall.args.context as Record<string, unknown> | undefined,
              conversationId: state.conversationId,
            },
          }
        }
      }
      // Found the most recent AIMessage — stop searching
      break
    }
  }

  return {}
}

/**
 * After tool execution, decide next step:
 * - If collaboration request → thinker (to inject target agent step)
 * - If task chain has more steps → thinker (continue chain)
 * - Otherwise → thinker (let agent process tool results)
 */
export function afterToolsRoute(
  state: typeof AgentStateAnnotation.State,
): string {
  // Collaboration request detected → thinker will inject the target agent step
  if (state.collaborationRequest) {
    return 'thinker'
  }

  // Auto 模式下，检查任务链
  if (state.context.source === 'standalone' && state.taskChain.length > 0) {
    const nextIndex = state.currentStepIndex + 1

    // 还有步骤需要执行
    if (nextIndex < state.taskChain.length) {
      return 'thinker'
    }

    // 所有步骤完成，进入总结
    return 'summarizer'
  }

  // 显式模式，回到 thinker 让 agent 处理工具结果
  return 'thinker'
}

// ────────────────────────────────────────────
// Build and compile the graph
// ────────────────────────────────────────────

const builder = new StateGraph(AgentStateAnnotation)
  // Nodes
  .addNode('thinker', thinkerNode)
  .addNode('editor', editorAgentNode)
  .addNode('flow', flowAgentNode)
  .addNode('general', generalAgentNode)
  .addNode('allTools', allToolNode)
  .addNode('afterTools', afterToolsNode)
  .addNode('summarizer', summarizerNode)

  // Entry point
  .addEdge(START, 'thinker')

  // Thinker → agent
  .addConditionalEdges('thinker', routeAfterThinker)

  // Editor agent → tools, next step, summarizer, or end
  .addConditionalEdges('editor', afterAgent)

  // Flow agent → tools, next step, summarizer, or end
  .addConditionalEdges('flow', afterAgent)

  // General agent → end (no tools)
  .addEdge('general', END)

  // After tool execution → extract collaboration from messages into state
  .addEdge('allTools', 'afterTools')

  // After extracting collaboration → route to thinker or summarizer
  .addConditionalEdges('afterTools', afterToolsRoute)

  // Summarizer → end
  .addEdge('summarizer', END)

const graph = builder.compile({ checkpointer })

export { graph }
