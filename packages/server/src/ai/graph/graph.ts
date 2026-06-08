/**
 * AI Agent Graph — StateGraph assembly.
 *
 * Graph structure:
 *   START -> router -> (agentSelector | taskChain | thinker) -> ... -> END
 *
 * Nodes:
 * - router: routing decisions (explicit mode, task chain, or LLM analysis)
 * - taskChain: task chain progression management
 * - thinker: pure LLM analysis + JSON parsing (auto mode only)
 * - editor/flow/page/general: expert agents
 * - allTools: tool execution
 * - afterTools: post-tool collaboration extraction
 * - summarizer: multi-step result summary
 */

import { StateGraph, END, START, BaseCheckpointSaver } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage, AIMessageChunk, SystemMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { AgentStateAnnotation } from './state.js'
import { editorAgentNode } from './editorAgent.js'
import { flowAgentNode } from './flowAgent.js'
import { pageAgentNode } from './pageAgent.js'
import { allTools } from '../tools/allTools.js'
import { checkpointer } from './checkpointer.js'
import { getLLM } from '../services/llmCache.js'
import { callLLMWithFallback } from './agentErrorHandler.js'

// ────────────────────────────────────────────
// Tool nodes
// ────────────────────────────────────────────

const allToolNode = new ToolNode(allTools)

// ────────────────────────────────────────────
// Router node — routing decisions only
// ────────────────────────────────────────────

async function routerNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  if (state.context.source === 'editor' || state.context.source === 'flow' || state.context.source === 'page') {
    const agent = state.context.source
    console.log(`[router] 显式模式 source=${agent}, 直接路由到 agentSelector`)
    return { session: { ...state.session, currentAgent: agent }, task: { ...state.task, type: 'generate_simple' }, tools: { ...state.tools, needsTool: true } }
  }

  if (state.task.chain.length > 0) {
    console.log(`[router] 任务链进行中 step=${state.task.currentStepIndex}/${state.task.chain.length}, 路由到 taskChain`)
    return {}
  }

  console.log(`[router] 自动模式, 路由到 thinker 进行 LLM 分析`)
  return {}
}

// ────────────────────────────────────────────
// Task chain node — chain progression management
// ────────────────────────────────────────────

async function taskChainNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const currentIndex = state.task.currentStepIndex

  if (state.interaction.collaborationRequest) {
    const { targetAgent, description } = state.interaction.collaborationRequest

    const newStep = {
      agent: targetAgent as 'editor' | 'flow' | 'page',
      description: `协作：${description}`,
      status: 'pending' as const,
      context: state.interaction.collaborationRequest.context,
    }

    const updatedChain = [
      ...state.task.chain.slice(0, currentIndex + 1),
      newStep,
      ...state.task.chain.slice(currentIndex + 1),
    ]

    updatedChain[currentIndex] = { ...updatedChain[currentIndex], status: 'done' as const }

    console.log(`[taskChain] 协作请求: 插入 ${targetAgent} 步骤到位置 ${currentIndex + 1}`)

    return {
      session: { ...state.session, currentAgent: targetAgent as 'editor' | 'flow' | 'page' },
      task: { ...state.task, type: 'generate_simple', chain: updatedChain, currentStepIndex: currentIndex + 1 },
      tools: { ...state.tools, needsTool: true },
      interaction: { ...state.interaction, collaborationRequest: null },
    }
  }

  if (currentIndex >= state.task.chain.length) {
    console.log(`[taskChain] 所有步骤完成, 路由到 summarizer`)
    return { session: { ...state.session, currentAgent: 'general' }, task: { ...state.task, type: 'summarize' }, tools: { ...state.tools, needsTool: false } }
  }

  const updatedChain = state.task.chain.map((step, i) => {
    if (i === currentIndex) return { ...step, status: 'running' as const }
    if (i < currentIndex) return { ...step, status: 'done' as const }
    return step
  })

  const currentStep = state.task.chain[currentIndex]
  console.log(`[taskChain] 执行步骤 ${currentIndex}: ${currentStep.agent} - ${currentStep.description}`)

  return {
    session: { ...state.session, currentAgent: currentStep.agent as 'editor' | 'flow' | 'page' },
    task: { ...state.task, type: 'generate_simple', chain: updatedChain, currentStepIndex: currentIndex },
    tools: { ...state.tools, needsTool: true },
  }
}

// ────────────────────────────────────────────
// Thinker node — pure LLM analysis
// ────────────────────────────────────────────

const THINKER_SYSTEM_PROMPT = `你是 schema-form-platform 的 AI 助手，基于 DeepSeek V4 Pro 模型驱动。

## 你的任务

1. **思考**：分析用户的需求，理解他们想要什么
2. **决策**：决定由哪些专家处理这个需求，以及执行顺序

## 可用的专家

### Editor 专家 - 表单/UI 生成
- 表单设计（输入框、选择器、日期、上传等 18 种表单组件）
- 页面布局（卡片、标签页、多列布局等 8 种容器）
- 图表可视化（柱状图、折线图、饼图等 9 种图表）

### Page 专家 - 业务页面配置
- 统计卡片页面（FgStatistic 展示关键指标）
- 详情页面（FgDescriptions 展示数据详情）
- 数据列表页面（FgTable 展示表格数据）
- 搜索列表页面（FgSearchList 实现搜索+列表）
- 仪表盘页面（组合多种组件构建数据看板）

### Flow 专家 - 流程/BPMN 生成
- 审批流程设计（单人审批、会签、或签）
- 工作流编排（节点、连线、分支、并行）
- BPMN 元素（开始/结束事件、用户任务、服务任务、网关）

### General - 通用回答
- 介绍平台能力
- 回答与平台无关的通用问题

## 输出格式

先用自然语言思考用户需求，然后输出 JSON 决策：

思考过程用自然语言描述...

\`\`\`json
{
  "target": "editor" | "page" | "flow" | "general" | "chain",
  "steps": [
    { "agent": "editor" | "page" | "flow", "description": "这一步做什么" }
  ]
}
\`\`\`

## 决策规则

1. **表单/UI 任务**：涉及表单输入、表单布局 -> "editor"
2. **业务页面任务**：涉及列表、统计、详情、仪表盘、搜索列表 -> "page"
3. **流程任务**：涉及流程/BPMN/审批 -> "flow"
4. **通用问题**：介绍、能力询问、与平台无关的问题 -> "general"
5. **联动任务**：同时涉及多个领域 -> "chain"，拆分为多步
6. **能力介绍**：用户问"你有什么能力"时 -> "general"，介绍所有能力`

async function thinkerNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const lastUserMessage = [...state.messages]
    .reverse()
    .find((m) => m.constructor.name === 'HumanMessage')

  const userContent = lastUserMessage
    ? (typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content))
    : '你好'

  console.log(`[thinker] 开始 LLM 分析, messages=${state.messages.length}`)

  const model = getLLM({ temperature: 0, maxTokens: 4096, jsonMode: true })

  try {
    // 使用流式调用，让 reasoning_content 可以通过 streamEvents 捕获
    const stream = await model.stream([
      new SystemMessage(THINKER_SYSTEM_PROMPT),
      new HumanMessage(userContent),
    ])

    let raw = ''
    for await (const chunk of stream) {
      const content = typeof chunk.content === 'string' ? chunk.content : ''
      if (content) raw += content
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        target: string
        steps?: Array<{ agent: string; description: string }>
      }

      if (parsed.target === 'chain' && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        const chain = parsed.steps.map((step) => ({
          agent: step.agent as 'editor' | 'flow' | 'page',
          description: step.description,
          status: 'pending' as const,
        }))
        console.log(`[thinker] 链式任务: ${chain.length} 步`)
        return {
          session: { ...state.session, currentAgent: chain[0].agent },
          task: { ...state.task, type: 'generate_simple', chain, currentStepIndex: 0 },
          tools: { ...state.tools, needsTool: true },
        }
      }

      if (parsed.target === 'flow') {
        console.log(`[thinker] 路由到 flow`)
        return {
          session: { ...state.session, currentAgent: 'flow' },
          task: { ...state.task, type: 'generate_simple', chain: [{ agent: 'flow', description: '生成流程', status: 'pending' }], currentStepIndex: 0 },
          tools: { ...state.tools, needsTool: true },
        }
      }
      if (parsed.target === 'page') {
        console.log(`[thinker] 路由到 page`)
        return {
          session: { ...state.session, currentAgent: 'page' },
          task: { ...state.task, type: 'generate_simple', chain: [{ agent: 'page', description: '生成业务页面', status: 'pending' }], currentStepIndex: 0 },
          tools: { ...state.tools, needsTool: true },
        }
      }
      if (parsed.target === 'general') {
        console.log(`[thinker] 路由到 general`)
        return { session: { ...state.session, currentAgent: 'general' }, task: { ...state.task, type: 'general' }, tools: { ...state.tools, needsTool: false } }
      }
    }

    console.log(`[thinker] 默认路由到 editor`)
    return {
      session: { ...state.session, currentAgent: 'editor' },
      task: { ...state.task, type: 'generate_simple', chain: [{ agent: 'editor', description: '生成表单', status: 'pending' }], currentStepIndex: 0 },
      tools: { ...state.tools, needsTool: true },
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.warn(`[thinker] LLM 调用失败，降级到关键词匹配路由: ${errMsg}`)
    const lower = userContent.toLowerCase()

    const isFlow = ['流程', '审批', '节点', 'BPMN', 'workflow'].some(kw => lower.includes(kw.toLowerCase()))
    const isPage = ['列表', '统计', '详情', '仪表盘', 'dashboard', '搜索列表', '数据表格'].some(kw => lower.includes(kw.toLowerCase()))

    let agent: 'editor' | 'flow' | 'page'
    let description: string

    if (isFlow) {
      agent = 'flow'
      description = '生成流程'
    } else if (isPage) {
      agent = 'page'
      description = '生成业务页面'
    } else {
      agent = 'editor'
      description = '生成表单'
    }

    console.log(`[thinker] 降级路由到 ${agent}`)
    return {
      session: { ...state.session, currentAgent: agent },
      task: { ...state.task, type: 'generate_simple', chain: [{ agent, description, status: 'pending' }], currentStepIndex: 0 },
      tools: { ...state.tools, needsTool: true },
    }
  }
}

// ────────────────────────────────────────────
// General agent node
// ────────────────────────────────────────────

const GENERAL_SYSTEM_PROMPT = `你是 schema-form-platform 的 AI 助手，基于 DeepSeek V4 Pro 模型驱动。

你有两个专家能力：

1. **Editor 专家**：表单/页面/UI 生成
2. **Flow 专家**：流程/BPMN 生成

请用友好、专业的语气回答用户问题。如果用户问你能做什么，引导他们描述具体需求。`

async function generalAgentNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const model = getLLM({ temperature: 0.7, maxTokens: 2048 })

  const lastUserMessage = [...state.messages]
    .reverse()
    .find((m) => m.constructor.name === 'HumanMessage')

  const userContent = lastUserMessage
    ? (typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content))
    : '你好'

  console.log(`[generalAgent] 开始执行, messages=${state.messages.length}`)

  const result = await callLLMWithFallback('generalAgent', async () => {
    const stream = await model.stream([
      new SystemMessage(GENERAL_SYSTEM_PROMPT),
      new HumanMessage(userContent),
    ])

    let content = ''
    let reasoningContent = ''
    for await (const chunk of stream) {
      const chunkContent = typeof chunk.content === 'string' ? chunk.content : ''
      const chunkReasoning = (chunk as any).additional_kwargs?.reasoning_content ?? (chunk as any).reasoning_content
      if (chunkContent) content += chunkContent
      if (chunkReasoning) reasoningContent += chunkReasoning
    }

    console.log(`[generalAgent] LLM 调用完成, contentLength=${content.length}, reasoningLength=${reasoningContent.length}`)

    const response = new AIMessage({
      content: reasoningContent ? `<think>${reasoningContent}</think>\n\n${content}` : content,
    })

    return { messages: [response] }
  })

  const messages = 'messages' in result ? result.messages : [new AIMessage({ content: '⚠️ AI 处理异常，请重试' })]
  return {
    messages,
    session: { ...state.session, currentAgent: 'general' },
  }
}

// ────────────────────────────────────────────
// Summarizer node
// ────────────────────────────────────────────

const SUMMARIZER_SYSTEM_PROMPT = `你是 schema-form-platform 的 AI 助手。你的任务是对专家智能体的执行结果进行总结。

请以助手身份回答，简洁明了，突出重点，给出后续建议。`

async function summarizerNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const lastUserMessage = [...state.messages]
    .reverse()
    .find((m) => m.constructor.name === 'HumanMessage')

  const userContent = lastUserMessage
    ? (typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content))
    : '你好'

  const taskResults = state.task.chain
    .filter((step) => step.status === 'done')
    .map((step) => `✅ ${step.agent} 专家：${step.description}`)
    .join('\n')

  const model = getLLM({ temperature: 0.7, maxTokens: 2048 })

  const prompt = `${SUMMARIZER_SYSTEM_PROMPT}

## 用户需求
${userContent}

## 执行结果
${taskResults || '无'}

请以助手身份总结执行结果，并给出后续建议。`

  // 降级内容：LLM 失败时直接返回任务列表
  const fallbackContent = `## 执行完成\n\n${taskResults || '无执行结果'}\n\n如需进一步调整，请继续描述需求。`

  const result = await callLLMWithFallback('summarizer', async () => {
    const stream = await model.stream([
      new SystemMessage(prompt),
      new HumanMessage(userContent),
    ])

    let content = ''
    for await (const chunk of stream) {
      const chunkContent = typeof chunk.content === 'string' ? chunk.content : ''
      if (chunkContent) content += chunkContent
    }

    return new AIMessage({ content })
  }, fallbackContent)

  const response = result instanceof AIMessage ? result : new AIMessage({ content: fallbackContent })

  return {
    messages: [response],
    session: { ...state.session, currentAgent: 'general' },
  }
}

// ────────────────────────────────────────────
// Conditional edge functions
// ────────────────────────────────────────────

export function routeAfterRouter(
  state: typeof AgentStateAnnotation.State,
): string {
  if (state.context.source === 'editor' || state.context.source === 'flow' || state.context.source === 'page') {
    console.log(`[routeAfterRouter] 显式模式 -> ${state.context.source} (source=${state.context.source})`)
    return state.context.source
  }

  if (state.task.chain.length > 0) {
    console.log(`[routeAfterRouter] 任务链 -> taskChain (step=${state.task.currentStepIndex}/${state.task.chain.length})`)
    return 'taskChain'
  }

  console.log(`[routeAfterRouter] 自动模式 -> thinker`)
  return 'thinker'
}

export function routeAfterTaskChain(
  state: typeof AgentStateAnnotation.State,
): string {
  console.log(`[routeAfterTaskChain] currentAgent=${state.session.currentAgent}, taskType=${state.task.type}`)

  if (state.task.type === 'summarize') {
    console.log(`[routeAfterTaskChain] -> summarizer (任务链完成)`)
    return 'summarizer'
  }

  if (state.session.currentAgent === 'editor') return 'editor'
  if (state.session.currentAgent === 'flow') return 'flow'
  if (state.session.currentAgent === 'page') return 'page'
  if (state.session.currentAgent === 'general') return 'general'

  console.warn(`[routeAfterTaskChain] 未知的 currentAgent="${state.session.currentAgent}", 路由到 END`)
  return END
}

export function routeAfterThinker(
  state: typeof AgentStateAnnotation.State,
): string {
  console.log(`[routeAfterThinker] currentAgent=${state.session.currentAgent}, taskChain=${state.task.chain.length}, step=${state.task.currentStepIndex}`)
  if (state.session.currentAgent === 'editor') return 'editor'
  if (state.session.currentAgent === 'flow') return 'flow'
  if (state.session.currentAgent === 'page') return 'page'
  if (state.session.currentAgent === 'general') return 'general'
  console.warn(`[routeAfterThinker] 未知的 currentAgent="${state.session.currentAgent}", 路由到 END`)
  return END
}

export function afterAgent(
  state: typeof AgentStateAnnotation.State,
): string {
  const lastMessage = state.messages[state.messages.length - 1]
  // 支持 AIMessage 和 AIMessageChunk（invoke 可能返回 Chunk）
  const isAiMessage = lastMessage instanceof AIMessage || lastMessage instanceof AIMessageChunk
  const hasToolCalls = isAiMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0

  console.log(`[afterAgent] source=${state.context.source}, hasToolCalls=${hasToolCalls}, taskChain=${state.task.chain.length}, step=${state.task.currentStepIndex}, messages=${state.messages.length}`)

  const MAX_TOOL_ITERATIONS = 3
  if (hasToolCalls) {
    if (state.tools.toolIterationCount >= MAX_TOOL_ITERATIONS) {
      console.warn(`[afterAgent] 工具迭代上限 ${MAX_TOOL_ITERATIONS}，强制结束`)
      return END
    }
    console.log(`[afterAgent] -> allTools (${lastMessage.tool_calls!.length} tool_calls)`)
    return 'allTools'
  }

  if (state.context.source === 'standalone' && state.task.chain.length > 0) {
    const nextIndex = state.task.currentStepIndex + 1

    if (nextIndex < state.task.chain.length) {
      console.log(`[afterAgent] -> taskChain (继续任务链 step ${nextIndex}/${state.task.chain.length})`)
      return 'taskChain'
    }

    console.log(`[afterAgent] -> summarizer (任务链完成)`)
    return 'summarizer'
  }

  console.log(`[afterAgent] -> END (显式模式, 无 tool_calls)`)
  return END
}

async function afterToolsNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const msg = state.messages[i]
    if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
      const collaborationCall = msg.tool_calls.find(
        (tc) => tc.name === 'request_collaboration'
      )

      if (collaborationCall) {
        const targetAgent = collaborationCall.args.targetAgent as string
        if (targetAgent === 'editor' || targetAgent === 'flow' || targetAgent === 'page') {
          return {
            tools: { ...state.tools, toolIterationCount: state.tools.toolIterationCount + 1 },
            interaction: {
              ...state.interaction,
              collaborationRequest: {
                targetAgent: targetAgent as 'editor' | 'flow' | 'page',
                description: collaborationCall.args.description as string,
                context: collaborationCall.args.context as Record<string, unknown> | undefined,
                conversationId: state.session.conversationId,
              },
            },
          }
        }
      }
      break
    }
  }

  return {
    tools: { ...state.tools, toolIterationCount: state.tools.toolIterationCount + 1 },
  }
}

export function afterToolsRoute(
  state: typeof AgentStateAnnotation.State,
): string {
  console.log(`[afterToolsRoute] source=${state.context.source}, taskChain=${state.task.chain.length}, step=${state.task.currentStepIndex}, collaboration=${!!state.interaction.collaborationRequest}`)

  if (state.interaction.collaborationRequest) {
    console.log(`[afterToolsRoute] -> taskChain (协作请求)`)
    return 'taskChain'
  }

  if (state.context.source === 'standalone' && state.task.chain.length > 0) {
    const nextIndex = state.task.currentStepIndex + 1

    if (nextIndex < state.task.chain.length) {
      console.log(`[afterToolsRoute] -> taskChain (继续任务链 step ${nextIndex}/${state.task.chain.length})`)
      return 'taskChain'
    }

    console.log(`[afterToolsRoute] -> summarizer (任务链完成)`)
    return 'summarizer'
  }

  console.log(`[afterToolsRoute] -> ${state.session.currentAgent} (显式模式)`)
  return state.session.currentAgent
}

// ────────────────────────────────────────────
// Build and compile the graph
// ────────────────────────────────────────────

const builder = new StateGraph(AgentStateAnnotation)
  .addNode('router', routerNode)
  .addNode('taskChain', taskChainNode)
  .addNode('thinker', thinkerNode)
  .addNode('editor', editorAgentNode)
  .addNode('flow', flowAgentNode)
  .addNode('page', pageAgentNode)
  .addNode('general', generalAgentNode)
  .addNode('allTools', allToolNode)
  .addNode('afterTools', afterToolsNode)
  .addNode('summarizer', summarizerNode)

  .addEdge(START, 'router')

  .addConditionalEdges('router', routeAfterRouter)
  .addConditionalEdges('taskChain', routeAfterTaskChain)
  .addConditionalEdges('thinker', routeAfterThinker)

  .addConditionalEdges('editor', afterAgent)
  .addConditionalEdges('flow', afterAgent)
  .addConditionalEdges('page', afterAgent)

  .addEdge('general', END)

  .addEdge('allTools', 'afterTools')
  .addConditionalEdges('afterTools', afterToolsRoute)

  .addEdge('summarizer', END)

const graph = builder.compile({ checkpointer: checkpointer as unknown as BaseCheckpointSaver })

export { graph }
