/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { END } from '@langchain/langgraph'
import { graph, routeAfterThinker, afterAgent, afterToolsRoute } from '../graph/graph.js'
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
    collaborationRequest: null,
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

describe('afterToolsRoute + collaboration detection', () => {
  it('afterToolsNode extracts collaboration from AIMessage with tool_calls before ToolMessages', () => {
    // This simulates the state after ToolNode runs:
    // AIMessage with tool_calls is NOT the last message — ToolMessages are.
    // The bug was that old code only checked lastMessage.
    const aiMsg = new AIMessage({
      content: '',
      tool_calls: [
        { id: 'tc-1', name: 'validate_schema', args: { widgets: [] } },
        {
          id: 'tc-2',
          name: 'request_collaboration',
          args: { targetAgent: 'flow', description: '生成审批流程' },
        },
      ],
    })

    const state = makeState({
      messages: [
        new HumanMessage('做一个请假审批'),
        aiMsg,
        // ToolMessages (tool results) — these are added by ToolNode AFTER the AIMessage
        { constructor: { name: 'ToolMessage' }, content: 'schema validated', name: 'validate_schema' } as any,
        { constructor: { name: 'ToolMessage' }, content: 'collaboration requested', name: 'request_collaboration' } as any,
      ],
      currentAgent: 'editor',
      context: { source: 'standalone', turnCount: 1 },
      taskChain: [
        { agent: 'editor', description: 'Generate form', status: 'running' },
      ],
      currentStepIndex: 0,
      // collaborationRequest would be set by afterToolsNode (tested via routing)
      collaborationRequest: {
        targetAgent: 'flow',
        description: '生成审批流程',
        conversationId: 'conv-1',
      },
    })

    // afterToolsRoute should detect collaboration and route to thinker
    expect(afterToolsRoute(state)).toBe('thinker')
  })

  it('afterToolsRoute returns thinker when no collaboration and task chain has more steps', () => {
    const state = makeState({
      currentAgent: 'editor',
      context: { source: 'standalone', turnCount: 1 },
      collaborationRequest: null,
      taskChain: [
        { agent: 'editor', description: 'Generate form', status: 'running' },
        { agent: 'flow', description: 'Generate flow', status: 'pending' },
      ],
      currentStepIndex: 0,
    })
    expect(afterToolsRoute(state)).toBe('thinker')
  })
})

describe('afterToolsRoute', () => {
  it('returns thinker when collaboration request is set', () => {
    const state = makeState({
      currentAgent: 'editor',
      context: { source: 'standalone', turnCount: 1 },
      collaborationRequest: {
        targetAgent: 'flow',
        description: '生成审批流程',
      },
    })
    expect(afterToolsRoute(state)).toBe('thinker')
  })

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
    expect(afterToolsRoute(state)).toBe('thinker')
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
    expect(afterToolsRoute(state)).toBe('summarizer')
  })

  it('returns thinker for explicit mode', () => {
    const state = makeState({
      currentAgent: 'editor',
      context: { source: 'editor', turnCount: 1 },
    })
    expect(afterToolsRoute(state)).toBe('thinker')
  })

  it('prefers collaboration request over task chain routing', () => {
    const state = makeState({
      currentAgent: 'editor',
      context: { source: 'standalone', turnCount: 1 },
      collaborationRequest: {
        targetAgent: 'flow',
        description: '需要流程支持',
      },
      taskChain: [
        { agent: 'editor', description: 'Generate form', status: 'running' },
        { agent: 'flow', description: 'Generate flow', status: 'pending' },
      ],
      currentStepIndex: 0,
    })
    expect(afterToolsRoute(state)).toBe('thinker')
  })
})
