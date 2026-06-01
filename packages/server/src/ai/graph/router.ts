/**
 * Router Agent node.
 *
 * Uses DeepSeek LLM to classify user intent and route to the correct
 * expert agent (editor or flow). Falls back to keyword matching on error.
 */

import type { AIConversationState } from './state.js'
import { ROUTER_SYSTEM_PROMPT } from '../prompts/router.js'
import { getClient, withRetry } from './agentBase.js'

// Keywords for fallback routing
const FLOW_KEYWORDS = [
  '流程', '审批', '节点', '分支', '条件', 'BPMN', 'bpmn',
  '工作流', 'workflow', '流转', '退回', '转办', '催办',
  '加签', '减签', '会签', '或签', '串行', '并行',
]

function fallbackRoute(message: string): 'editor' | 'flow' {
  const lower = message.toLowerCase()
  return FLOW_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase())) ? 'flow' : 'editor'
}

export async function routerNode(
  state: AIConversationState,
): Promise<Partial<AIConversationState>> {
  const lastUserMessage = [...state.messages]
    .reverse()
    .find((m) => m.role === 'user')

  if (!lastUserMessage) {
    return {
      activeAgent: 'editor',
      error: { message: 'No user message found.', recoverable: true },
    }
  }

  try {
    const openai = getClient()
    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: ROUTER_SYSTEM_PROMPT },
          { role: 'user', content: lastUserMessage.content },
        ],
        temperature: 0,
        max_tokens: 100,
      }),
    )

    const raw = completion.choices[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { target?: string }
      if (parsed.target === 'flow') {
        return { activeAgent: 'flow' }
      }
    }
    return { activeAgent: 'editor' }
  } catch {
    // Fallback to keyword matching on LLM error
    const target = fallbackRoute(lastUserMessage.content)
    return { activeAgent: target }
  }
}
