/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { END } from '@langchain/langgraph'
import { graph, routeAfterRouter, shouldCallTools } from '../graph/graph.js'
import type { AgentStateAnnotation } from '../graph/state.js'

type State = typeof AgentStateAnnotation.State

function makeState(overrides: Partial<State> = {}): State {
  return {
    messages: [],
    sessionId: '',
    conversationId: '',
    currentAgent: 'router',
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
    ...overrides,
  }
}

describe('graph assembly', () => {
  it('exports a compiled graph', () => {
    expect(graph).toBeDefined()
    expect(typeof graph.streamEvents).toBe('function')
    expect(typeof graph.invoke).toBe('function')
  })

  it('graph has streamEvents method for SSE streaming', () => {
    // Verify the graph supports the v2 streamEvents API used by routes
    expect(graph.streamEvents).toBeDefined()
    expect(graph.streamEvents.length).toBeGreaterThanOrEqual(2)
  })
})

describe('routeAfterRouter', () => {
  it('routes to editor when currentAgent is editor', () => {
    const state = makeState({ currentAgent: 'editor' })
    expect(routeAfterRouter(state)).toBe('editor')
  })

  it('routes to flow when currentAgent is flow', () => {
    const state = makeState({ currentAgent: 'flow' })
    expect(routeAfterRouter(state)).toBe('flow')
  })

  it('routes to END when currentAgent is router', () => {
    const state = makeState({ currentAgent: 'router' })
    expect(routeAfterRouter(state)).toBe(END)
  })

  it('routes to END for unknown agent', () => {
    const state = makeState({ currentAgent: 'unknown' as any })
    expect(routeAfterRouter(state)).toBe(END)
  })
})

describe('shouldCallTools', () => {
  it('returns editorTools when editor agent has tool_calls', () => {
    const aiMessage = new AIMessage({
      content: '',
      tool_calls: [{ id: 'tc-1', name: 'search_schemas', args: { keyword: 'test' } }],
    })
    const state = makeState({
      messages: [new HumanMessage('test'), aiMessage],
      currentAgent: 'editor',
    })
    expect(shouldCallTools(state)).toBe('editorTools')
  })

  it('returns flowTools when flow agent has tool_calls', () => {
    const aiMessage = new AIMessage({
      content: '',
      tool_calls: [{ id: 'tc-1', name: 'search_flows', args: { keyword: 'test' } }],
    })
    const state = makeState({
      messages: [new HumanMessage('test'), aiMessage],
      currentAgent: 'flow',
    })
    expect(shouldCallTools(state)).toBe('flowTools')
  })

  it('returns END when last message has no tool_calls', () => {
    const aiMessage = new AIMessage({ content: 'Here is your form.' })
    const state = makeState({
      messages: [new HumanMessage('test'), aiMessage],
      currentAgent: 'editor',
    })
    expect(shouldCallTools(state)).toBe(END)
  })

  it('returns END when last message has empty tool_calls', () => {
    const aiMessage = new AIMessage({
      content: 'Done.',
      tool_calls: [],
    })
    const state = makeState({
      messages: [new HumanMessage('test'), aiMessage],
      currentAgent: 'editor',
    })
    expect(shouldCallTools(state)).toBe(END)
  })

  it('returns END when last message is a HumanMessage', () => {
    const state = makeState({
      messages: [new HumanMessage('generate a form')],
      currentAgent: 'editor',
    })
    expect(shouldCallTools(state)).toBe(END)
  })
})
