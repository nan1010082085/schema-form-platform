/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { routerNode } from '../graph/router.js'
import type { AIConversationState } from '../graph/state.js'

function makeState(content: string): AIConversationState {
  return {
    messages: [{ role: 'user', content, timestamp: new Date() }],
    activeAgent: 'router',
    context: { source: 'standalone', turnCount: 1 },
  }
}

describe('routerNode', () => {
  it('routes form/UI requests to editor', async () => {
    const result = await routerNode(makeState('生成一个用户注册表单'))
    expect(result.activeAgent).toBe('editor')
  })

  it('routes input/select/table requests to editor', async () => {
    const result = await routerNode(makeState('添加一个下拉选择框'))
    expect(result.activeAgent).toBe('editor')
  })

  it('routes page layout requests to editor', async () => {
    const result = await routerNode(makeState('创建一个搜索列表页面'))
    expect(result.activeAgent).toBe('editor')
  })

  it('routes flow keywords to flow', async () => {
    const result = await routerNode(makeState('创建一个审批流程'))
    expect(result.activeAgent).toBe('flow')
  })

  it('routes BPMN keywords to flow', async () => {
    const result = await routerNode(makeState('设计一个BPMN工作流'))
    expect(result.activeAgent).toBe('flow')
  })

  it('routes 会签/或签 to flow', async () => {
    const result = await routerNode(makeState('设置会签节点'))
    expect(result.activeAgent).toBe('flow')
  })

  it('defaults to editor for ambiguous input', async () => {
    const result = await routerNode(makeState('帮我做一个东西'))
    expect(result.activeAgent).toBe('editor')
  })

  it('handles case-insensitive matching', async () => {
    const result = await routerNode(makeState('WORKFLOW design'))
    expect(result.activeAgent).toBe('flow')
  })

  it('returns error when no user message found', async () => {
    const state: AIConversationState = {
      messages: [],
      activeAgent: 'router',
      context: { source: 'standalone', turnCount: 0 },
    }
    const result = await routerNode(state)
    expect(result.activeAgent).toBe('editor')
    expect(result.error).toBeDefined()
    expect(result.error!.recoverable).toBe(true)
  })
})
