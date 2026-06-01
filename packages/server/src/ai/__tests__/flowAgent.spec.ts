/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}))

vi.mock('../tools/flowTools.js', () => ({
  FLOW_TOOLS: [
    { type: 'function', function: { name: 'search_flows', description: 'Search flows', parameters: { type: 'object', properties: {} } } },
    { type: 'function', function: { name: 'validate_flow', description: 'Validate flow', parameters: { type: 'object', properties: {} } } },
  ],
  executeFlowTool: vi.fn(async (name: string) => {
    if (name === 'search_flows') return { success: true, data: { total: 1, flows: [{ id: 'f1', name: '审批流程' }] } }
    if (name === 'validate_flow') return { success: true, data: { valid: true, errors: [] } }
    return { success: false, error: 'Unknown tool' }
  }),
  validateFlowGraph: vi.fn(() => []),
}))

function makeState(content: string, currentFlow?: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }) {
  return {
    messages: [{ role: 'user' as const, content, timestamp: new Date() }],
    activeAgent: 'flow' as const,
    context: { source: 'flow' as const, turnCount: 1, currentFlow },
  }
}

function buildFlowOutput(params: {
  thinking?: string
  answer?: string
  tip?: string
  flow?: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }
}): string {
  const parts: string[] = []
  if (params.thinking) parts.push(`<think>\n${params.thinking}\n</think>`)
  if (params.answer) parts.push(`<answer>\n${params.answer}\n</answer>`)
  if (params.tip) parts.push(`<tip>\n${params.tip}\n</tip>`)
  if (params.flow) {
    parts.push(`<schema>\n${JSON.stringify({ type: 'flow_update', flow: params.flow })}\n</schema>`)
  }
  return parts.join('\n\n')
}

function makeAsyncIterable(chunks: Array<{ choices: Array<{ delta: { content?: string; tool_calls?: unknown[] } }> }>) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk
      }
    },
  }
}

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  process.env.DEEPSEEK_API_KEY = 'test-key'
})

describe('streamFlowAgent', () => {
  async function loadStreamFlowAgent() {
    vi.doMock('openai', () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      })),
    }))
    vi.doMock('../tools/flowTools.js', () => ({
      FLOW_TOOLS: [
        { type: 'function', function: { name: 'search_flows', description: 'Search flows', parameters: { type: 'object', properties: {} } } },
      ],
      executeFlowTool: vi.fn(async (name: string) => {
        if (name === 'search_flows') return { success: true, data: { total: 1, flows: [] } }
        return { success: false, error: 'Unknown tool' }
      }),
      validateFlowGraph: vi.fn(() => []),
    }))
    const mod = await import('../graph/flowAgent.js')
    return mod.streamFlowAgent
  }

  it('yields thinking and flow events', async () => {
    const streamFlowAgent = await loadStreamFlowAgent()

    const fullOutput = buildFlowOutput({
      thinking: '分析流程需求',
      answer: '已生成审批流程',
      flow: {
        nodes: [
          { id: 'n1', data: { bpmnType: 'startEvent', label: '开始' } },
          { id: 'n2', data: { bpmnType: 'userTask', label: '审批' } },
          { id: 'n3', data: { bpmnType: 'endEvent', label: '结束' } },
        ],
        edges: [
          { id: 'e1', source: { cell: 'n1' }, target: { cell: 'n2' } },
          { id: 'e2', source: { cell: 'n2' }, target: { cell: 'n3' } },
        ],
      },
    })

    const chunks = fullOutput.split('').map((char) => ({
      choices: [{ delta: { content: char } }],
    }))

    mockCreate.mockResolvedValue(makeAsyncIterable(chunks))

    const events: Array<{ type: string; content?: string; payload?: unknown }> = []
    for await (const event of streamFlowAgent(makeState('生成审批流程'))) {
      events.push(event)
    }

    const thinkingEvents = events.filter((e) => e.type === 'thinking')
    expect(thinkingEvents.length).toBeGreaterThan(0)

    const textEvents = events.filter((e) => e.type === 'text')
    expect(textEvents.length).toBe(1)
    expect(textEvents[0].content).toBe('已生成审批流程')

    const flowEvents = events.filter((e) => e.type === 'flow')
    expect(flowEvents.length).toBe(1)
    expect(flowEvents[0].payload).toBeDefined()
  })

  it('yields tip event', async () => {
    const streamFlowAgent = await loadStreamFlowAgent()

    const fullOutput = buildFlowOutput({
      answer: '流程已生成',
      tip: '建议添加超时节点',
    })

    const chunks = fullOutput.split('').map((char) => ({
      choices: [{ delta: { content: char } }],
    }))

    mockCreate.mockResolvedValue(makeAsyncIterable(chunks))

    const events: Array<{ type: string; content?: string }> = []
    for await (const event of streamFlowAgent(makeState('test'))) {
      events.push(event)
    }

    expect(events.some((e) => e.type === 'tip')).toBe(true)
  })

  it('yields tool_call events and continues generation', async () => {
    const streamFlowAgent = await loadStreamFlowAgent()

    const toolCallStream = makeAsyncIterable([
      { choices: [{ delta: { tool_calls: [{ index: 0, id: 'tc-1', function: { name: 'search_flows', arguments: '{"key' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'word":"审批"}' } }] } }] },
    ])

    const answerOutput = buildFlowOutput({ answer: '已找到流程' })
    const answerStream = makeAsyncIterable(
      answerOutput.split('').map((char) => ({ choices: [{ delta: { content: char } }] })),
    )

    mockCreate
      .mockResolvedValueOnce(toolCallStream)
      .mockResolvedValueOnce(answerStream)

    const events: Array<{ type: string; toolCalls?: unknown[]; toolResults?: unknown[]; content?: string }> = []
    for await (const event of streamFlowAgent(makeState('查找审批流程'))) {
      events.push(event)
    }

    const toolCallEvents = events.filter((e) => e.type === 'tool_call')
    expect(toolCallEvents.length).toBe(2)

    const callingEvent = toolCallEvents.find((e) => e.toolCalls)
    expect(callingEvent).toBeDefined()
    expect(callingEvent!.toolCalls![0].name).toBe('search_flows')

    const resultEvent = toolCallEvents.find((e) => e.toolResults)
    expect(resultEvent).toBeDefined()

    const textEvents = events.filter((e) => e.type === 'text')
    expect(textEvents.length).toBe(1)
    expect(textEvents[0].content).toBe('已找到流程')
  })

  it('includes current flow in prompt when provided', async () => {
    const streamFlowAgent = await loadStreamFlowAgent()

    const fullOutput = buildFlowOutput({ answer: 'ok' })
    const chunks = fullOutput.split('').map((char) => ({
      choices: [{ delta: { content: char } }],
    }))

    mockCreate.mockResolvedValue(makeAsyncIterable(chunks))

    const currentFlow = {
      nodes: [{ id: 'n1', data: { bpmnType: 'startEvent', label: '开始' } }],
      edges: [],
    }
    const events: Array<{ type: string }> = []
    for await (const event of streamFlowAgent(makeState('修改流程', currentFlow))) {
      events.push(event)
    }

    const userMsg = mockCreate.mock.calls[0][0].messages[1]
    expect(userMsg.content).toContain('当前已有流程')
  })

  it('calls OpenAI with correct params', async () => {
    const streamFlowAgent = await loadStreamFlowAgent()

    const fullOutput = buildFlowOutput({ answer: 'ok' })
    const chunks = fullOutput.split('').map((char) => ({
      choices: [{ delta: { content: char } }],
    }))

    mockCreate.mockResolvedValue(makeAsyncIterable(chunks))

    const events: Array<{ type: string }> = []
    for await (const event of streamFlowAgent(makeState('test'))) {
      events.push(event)
    }

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'deepseek-chat',
        temperature: 0.7,
        max_tokens: 8192,
        tool_choice: 'auto',
        stream: true,
      }),
    )
  })

  it('yields error when flow validation fails', async () => {
    const streamFlowAgent = await loadStreamFlowAgent()

    const fullOutput = buildFlowOutput({
      answer: '流程已生成',
      flow: {
        nodes: [{ id: 'n1', data: { bpmnType: 'userTask', label: '审批' } }],
        edges: [],
      },
    })

    const chunks = fullOutput.split('').map((char) => ({
      choices: [{ delta: { content: char } }],
    }))

    mockCreate.mockResolvedValue(makeAsyncIterable(chunks))

    // Override validateFlowGraph to return errors
    const { validateFlowGraph } = await import('../tools/flowTools.js')
    vi.mocked(validateFlowGraph).mockReturnValueOnce(['缺少 startEvent 开始节点'])

    const events: Array<{ type: string; content?: string }> = []
    for await (const event of streamFlowAgent(makeState('test'))) {
      events.push(event)
    }

    const errorEvents = events.filter((e) => e.type === 'error')
    expect(errorEvents.length).toBe(1)
    expect(errorEvents[0].content).toContain('缺少 startEvent')
  })

  it('yields error when tool rounds exceed limit', async () => {
    const streamFlowAgent = await loadStreamFlowAgent()

    // Create a stream that always returns tool calls
    function makeToolCallStream() {
      return makeAsyncIterable([
        { choices: [{ delta: { tool_calls: [{ index: 0, id: 'tc-1', function: { name: 'search_flows', arguments: '{}' } }] } }] },
      ])
    }

    // Mock 6 rounds of tool calls (exceeds MAX_TOOL_ROUNDS=5)
    for (let i = 0; i < 6; i++) {
      mockCreate.mockResolvedValueOnce(makeToolCallStream())
    }

    const events: Array<{ type: string; content?: string }> = []
    for await (const event of streamFlowAgent(makeState('test'))) {
      events.push(event)
    }

    const errorEvents = events.filter((e) => e.type === 'error')
    expect(errorEvents.length).toBe(1)
    expect(errorEvents[0].content).toContain('工具调用轮次超过上限')
  })
})
