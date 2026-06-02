/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { HumanMessage } from '@langchain/core/messages'
import { routerNode } from '../graph/router.js'
import type { AgentStateAnnotation } from '../graph/state.js'

type State = typeof AgentStateAnnotation.State

function makeState(content: string): State {
  return {
    messages: [new HumanMessage(content)],
    currentAgent: 'router',
    sessionId: '',
    conversationId: '',
    context: { source: 'standalone', turnCount: 1 },
    taskType: 'general',
    needsTool: false,
    toolResults: [],
    error: null,
    clarificationRequest: null,
    clarificationOptions: [],
    taskChain: [],
    currentStepIndex: 0,
    intermediateResults: [],
    preferences: {},
    historySummary: '',
  }
}

describe('routerNode', () => {
  it('routes form/UI requests to editor', async () => {
    const result = await routerNode(makeState('生成一个用户注册表单'))
    expect(result.currentAgent).toBe('editor')
  })

  it('routes input/select/table requests to editor', async () => {
    const result = await routerNode(makeState('添加一个下拉选择框'))
    expect(result.currentAgent).toBe('editor')
  })

  it('routes page layout requests to editor', async () => {
    const result = await routerNode(makeState('创建一个搜索列表页面'))
    expect(result.currentAgent).toBe('editor')
  })

  it('routes flow keywords to flow', async () => {
    const result = await routerNode(makeState('创建一个审批流程'))
    expect(result.currentAgent).toBe('flow')
  })

  it('routes BPMN keywords to flow', async () => {
    const result = await routerNode(makeState('设计一个BPMN工作流'))
    expect(result.currentAgent).toBe('flow')
  })

  it('routes 会签/或签 to flow', async () => {
    const result = await routerNode(makeState('设置会签节点'))
    expect(result.currentAgent).toBe('flow')
  })

  it('defaults to editor for ambiguous input', async () => {
    const result = await routerNode(makeState('帮我做一个东西'))
    expect(result.currentAgent).toBe('editor')
  })

  it('handles case-insensitive matching', async () => {
    const result = await routerNode(makeState('WORKFLOW design'))
    expect(result.currentAgent).toBe('flow')
  })

  it('returns error when no user message found', async () => {
    const state: State = {
      messages: [],
      currentAgent: 'router',
      sessionId: '',
      conversationId: '',
      context: { source: 'standalone', turnCount: 0 },
      taskType: 'general',
      needsTool: false,
      toolResults: [],
      error: null,
      clarificationRequest: null,
      clarificationOptions: [],
      taskChain: [],
      currentStepIndex: 0,
      intermediateResults: [],
      preferences: {},
      historySummary: '',
    }
    const result = await routerNode(state)
    expect(result.currentAgent).toBe('editor')
    expect(result.error).toBeDefined()
    expect(result.error!.recoverable).toBe(true)
  })
})
