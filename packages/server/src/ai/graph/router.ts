/**
 * Router Agent node.
 *
 * Uses DeepSeek LLM to classify user intent and route to the correct
 * expert agent (editor or flow). Supports multi-step task chains for
 * complex requests that involve both form and flow generation.
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { ROUTER_SYSTEM_PROMPT } from '@schema-form/shared-ai/promptBuilder'
import type { AgentStateAnnotation } from './state.js'

// Keywords for fallback routing when LLM fails
const FLOW_KEYWORDS = [
  '流程', '审批', '节点', '分支', '条件', 'BPMN', 'bpmn',
  '工作流', 'workflow', '流转', '退回', '转办', '催办',
  '加签', '减签', '会签', '或签', '串行', '并行',
]

function fallbackRoute(message: string): 'editor' | 'flow' {
  const lower = message.toLowerCase()
  return FLOW_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase())) ? 'flow' : 'editor'
}

interface RouterResult {
  target: 'editor' | 'flow' | 'chain'
  steps?: Array<{ agent: 'editor' | 'flow'; description: string }>
}

/**
 * Router node classifies user intent and sets activeAgent + taskChain.
 *
 * Returns partial state update:
 * - currentAgent: 'editor' | 'flow'
 * - taskType: classified task type string
 * - needsTool: whether the routed agent should use tools
 * - taskChain + currentStepIndex for multi-step requests
 */
export async function routerNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const lastUserMessage = [...state.messages]
    .reverse()
    .find((m) => m.constructor.name === 'HumanMessage')

  if (!lastUserMessage) {
    return {
      currentAgent: 'editor',
      error: { message: 'No user message found.', recoverable: true },
    }
  }

  const userContent = typeof lastUserMessage.content === 'string'
    ? lastUserMessage.content
    : JSON.stringify(lastUserMessage.content)

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required.')
    }

    const model = new ChatOpenAI({
      model: 'deepseek-v4-pro',
      apiKey,
      configuration: { baseURL: 'https://api.deepseek.com' },
      temperature: 0,
      maxTokens: 200,
      modelKwargs: { response_format: { type: 'json_object' } },
    })

    const response = await model.invoke([
      new SystemMessage(ROUTER_SYSTEM_PROMPT),
      new HumanMessage(userContent),
    ])

    const raw = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as RouterResult

      // Multi-step task chain
      if (parsed.target === 'chain' && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        const taskChain = parsed.steps.map((step) => ({
          agent: step.agent,
          description: step.description,
          status: 'pending' as const,
        }))
        return {
          currentAgent: taskChain[0].agent,
          taskChain,
          currentStepIndex: 0,
          taskType: 'chain',
          needsTool: true,
        }
      }

      // Single step routing
      if (parsed.target === 'flow') {
        return {
          currentAgent: 'flow',
          taskType: 'generate_simple',
          needsTool: true,
        }
      }
    }

    return {
      currentAgent: 'editor',
      taskType: 'generate_simple',
      needsTool: true,
    }
  } catch {
    // Fallback to keyword matching on LLM error
    const target = fallbackRoute(userContent)
    return {
      currentAgent: target,
      taskType: 'generate_simple',
      needsTool: true,
    }
  }
}
