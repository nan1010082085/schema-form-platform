/**
 * AI Agent Graph — StateGraph assembly.
 *
 * Wires router, editor agent, flow agent, and their tool nodes
 * into a single compiled LangGraph graph with conditional routing.
 *
 * Graph structure:
 *   START → router → (editor | flow | END)
 *   editor ↔ editorTools (tool call loop)
 *   flow   ↔ flowTools   (tool call loop)
 */

import { StateGraph, END, START } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage } from '@langchain/core/messages'
import { AgentStateAnnotation } from './state.js'
import { routerNode } from './router.js'
import { editorAgentNode } from './editorAgent.js'
import { flowAgentNode } from './flowAgent.js'
import { editorTools } from '../tools/editorTools.js'
import { flowTools } from '../tools/flowTools.js'
import { checkpointer } from './checkpointer.js'

// ────────────────────────────────────────────
// Tool nodes (executes tool calls from LLM)
// ────────────────────────────────────────────

const editorToolNode = new ToolNode(editorTools)
const flowToolNode = new ToolNode(flowTools)

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
    return state.currentAgent === 'flow' ? 'flowTools' : 'editorTools'
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
  .addNode('editorTools', editorToolNode)
  .addNode('flow', flowAgentNode)
  .addNode('flowTools', flowToolNode)

  // Entry point
  .addEdge(START, 'router')

  // Router → agent (or END for clarification/error)
  .addConditionalEdges('router', routeAfterRouter)

  // Editor agent → tools or end
  .addConditionalEdges('editor', shouldCallTools)

  // Flow agent → tools or end
  .addConditionalEdges('flow', shouldCallTools)

  // After tool execution, loop back to the agent that requested them
  .addEdge('editorTools', 'editor')
  .addEdge('flowTools', 'flow')

const graph = builder.compile({ checkpointer })

export { graph }
