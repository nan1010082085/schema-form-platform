/**
 * AI Agent Graph — StateGraph assembly.
 *
 * Wires router, editor agent, flow agent, and their tool nodes
 * into a single compiled LangGraph graph with conditional routing.
 *
 * Graph structure:
 *   START → router → (editor | flow | general | END)
 *   editor ↔ allTools (tool call loop)
 *   flow   ↔ allTools (tool call loop)
 */

import { StateGraph, END, START } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage } from '@langchain/core/messages'
import { AgentStateAnnotation } from './state.js'
import { routerNode } from './router.js'
import { editorAgentNode } from './editorAgent.js'
import { flowAgentNode } from './flowAgent.js'
import { allTools } from '../tools/allTools.js'
import { checkpointer } from './checkpointer.js'

// ────────────────────────────────────────────
// Tool nodes (executes tool calls from LLM)
// ────────────────────────────────────────────

const allToolNode = new ToolNode(allTools)

// ────────────────────────────────────────────
// General agent node (for universal responses)
// ────────────────────────────────────────────

async function generalAgentNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const content = `我是 schema-form-platform 的 AI 助手，我有两个专家能力：

1. **Editor 专家**：表单/页面/UI 生成
   - 表单设计（输入框、选择器、日期、上传等）
   - 页面布局（卡片、栅格、标签页、弹窗）
   - 数据表格（列表、可编辑表格、搜索列表）
   - 图表可视化（柱状图、折线图、饼图等）

2. **Flow 专家**：流程/BPMN 生成
   - 审批流程设计（单人审批、会签、或签）
   - 工作流编排（节点、连线、分支、并行）
   - BPMN 元素（开始/结束事件、用户任务、服务任务、网关）
   - 流程配置（指派人、表单绑定、条件表达式、超时设置）

你可以告诉我你想做什么，我会自动选择合适的专家来帮助你。`

  return {
    messages: [new AIMessage(content)],
    currentAgent: 'general',
  }
}

// ────────────────────────────────────────────
// Conditional edge functions
// ────────────────────────────────────────────

/**
 * After the router node, dispatch to the correct agent based on
 * `state.currentAgent` set by the router.
 */
export function routeAfterRouter(
  state: typeof AgentStateAnnotation.State,
): string {
  if (state.currentAgent === 'editor') return 'editor'
  if (state.currentAgent === 'flow') return 'flow'
  if (state.currentAgent === 'general') return 'general'
  return END
}

/**
 * After an agent node, check if the LLM returned tool_calls.
 * If yes, route to the matching ToolNode; otherwise end the turn.
 */
export function shouldCallTools(
  state: typeof AgentStateAnnotation.State,
): string {
  const lastMessage = state.messages[state.messages.length - 1]
  if (
    lastMessage instanceof AIMessage &&
    lastMessage.tool_calls &&
    lastMessage.tool_calls.length > 0
  ) {
    return 'allTools'
  }
  return END
}

// ────────────────────────────────────────────
// Build and compile the graph
// ────────────────────────────────────────────

const builder = new StateGraph(AgentStateAnnotation)
  // Nodes
  .addNode('router', routerNode)
  .addNode('editor', editorAgentNode)
  .addNode('flow', flowAgentNode)
  .addNode('general', generalAgentNode)
  .addNode('allTools', allToolNode)

  // Entry point
  .addEdge(START, 'router')

  // Router → agent (or END for clarification/error)
  .addConditionalEdges('router', routeAfterRouter)

  // Editor agent → tools or end
  .addConditionalEdges('editor', shouldCallTools)

  // Flow agent → tools or end
  .addConditionalEdges('flow', shouldCallTools)

  // General agent → end (no tools)
  .addEdge('general', END)

  // After tool execution, loop back to the agent that requested them
  .addEdge('allTools', 'router')

const graph = builder.compile({ checkpointer })

export { graph }
