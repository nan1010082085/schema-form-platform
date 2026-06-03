/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { END } from '@langchain/langgraph'
import { graph, routeAfterThinker, afterAgent, afterTools } from '../graph/graph.js'
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
    expect(graph.streamEvents).toBeDefined()
    expect(graph.streamEvents.length).toBeGreaterThanOrEqual(2)
  })
})

describe('routeAfterThinker', () => {
  it('routes to editor when currentAgent is editor', () => {
    const state = makeState({ currentAgent: 'editor' })
    expect(routeAfterThinker(state)).toBe('editor')
  })

  it('routes to flow when currentAgent is flow', () => {
    const state = makeState({ currentAgent: 'flow' })
    expect(routeAfterThinker(state)).toBe('flow')
  })

  it('routes to general when currentAgent is general', () => {
    const state = makeState({ currentAgent: 'general' })
    expect(routeAfterThinker(state)).toBe('general')
  })

  it('routes to END for unknown agent', () => {
    const state = makeState({ currentAgent: 'unknown' as any })
    expect(routeAfterThinker(state)).toBe(END)
  })
})

describe('afterAgent', () => {
  it('returns allTools when agent has tool_calls', () => {
    const aiMessage = new AIMessage({
      content: '',
      tool_calls: [{ id: 'tc-1', name: 'search_schemas', args: { keyword: 'test' } }],
    })
    const state = makeState({
      messages: [new HumanMessage('test'), aiMessage],
      currentAgent: 'editor',
    })
    expect(afterAgent(state)).toBe('allTools')
  })

  it('returns END when no tool_calls and no task chain', () => {
    const aiMessage = new AIMessage({ content: 'Here is your form.' })
    const state = makeState({
      messages: [new HumanMessage('test'), aiMessage],
      currentAgent: 'editor',
      context: { source: 'editor', turnCount: 1 },
    })
    expect(afterAgent(state)).toBe(END)
  })

  it('returns thinker when task chain has more steps', () => {
    const aiMessage = new AIMessage({ content: 'Form generated.' })
    const state = makeState({
      messages: [new HumanMessage('test'), aiMessage],
      currentAgent: 'editor',
      context: { source: 'standalone', turnCount: 1 },
      taskChain: [
        { agent: 'editor', description: 'Generate form', status: 'done' },
        { agent: 'flow', description: 'Generate flow', status: 'pending' },
      ],
      currentStepIndex: 0,
    })
    expect(afterAgent(state)).toBe('thinker')
  })

  it('returns summarizer when all task chain steps complete', () => {
    const aiMessage = new AIMessage({ content: 'Flow generated.' })
    const state = makeState({
      messages: [new HumanMessage('test'), aiMessage],
      currentAgent: 'flow',
      context: { source: 'standalone', turnCount: 1 },
      taskChain: [
        { agent: 'editor', description: 'Generate form', status: 'done' },
        { agent: 'flow', description: 'Generate flow', status: 'done' },
      ],
      currentStepIndex: 1,
    })
    expect(afterAgent(state)).toBe('summarizer')
  })
})

describe('afterTools', () => {
  it('returns thinker when task chain has more steps', () => {
    const state = makeState({
      currentAgent: 'editor',
      context: { source: 'standalone', turnCount: 1 },
      taskChain: [
        { agent: 'editor', description: 'Generate form', status: 'running' },
        { agent: 'flow', description: 'Generate flow', status: 'pending' },
      ],
      currentStepIndex: 0,
    })
    expect(afterTools(state)).toBe('thinker')
  })

  it('returns summarizer when all task chain steps complete', () => {
    const state = makeState({
      currentAgent: 'flow',
      context: { source: 'standalone', turnCount: 1 },
      taskChain: [
        { agent: 'editor', description: 'Generate form', status: 'done' },
        { agent: 'flow', description: 'Generate flow', status: 'running' },
      ],
      currentStepIndex: 1,
    })
    expect(afterTools(state)).toBe('summarizer')
  })

  it('returns thinker for explicit mode', () => {
    const state = makeState({
      currentAgent: 'editor',
      context: { source: 'editor', turnCount: 1 },
    })
    expect(afterTools(state)).toBe('thinker')
  })
})
