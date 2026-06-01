/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared mock for chat completions create
const mockCreate = vi.fn()

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}))

vi.mock('../tools/widgetTools.js', () => ({
  validateSchema: vi.fn(() => ({ valid: true, errors: [] })),
}))

vi.mock('../tools/editorTools.js', () => ({
  EDITOR_TOOLS: [
    { type: 'function', function: { name: 'search_schemas', description: 'Search schemas', parameters: { type: 'object', properties: {} } } },
    { type: 'function', function: { name: 'get_widget_catalogue', description: 'Get widget catalogue', parameters: { type: 'object', properties: {} } } },
  ],
  executeEditorTool: vi.fn(async (name: string, _args: Record<string, unknown>) => {
    if (name === 'search_schemas') return { success: true, data: { total: 2, schemas: [{ id: '1', name: '用户表单' }] } }
    if (name === 'get_widget_catalogue') return { success: true, data: { total: 44, widgets: [] } }
    return { success: false, error: 'Unknown tool' }
  }),
}))

function makeState(content: string, currentSchema?: Record<string, unknown>[]) {
  return {
    messages: [{ role: 'user' as const, content, timestamp: new Date() }],
    activeAgent: 'editor' as const,
    context: { source: 'standalone' as const, turnCount: 1, currentSchema },
  }
}

/** Build a structured output with <think>/answer/tip/schema tags */
function buildStructuredOutput(params: {
  thinking?: string
  answer?: string
  tip?: string
  widgets?: Record<string, unknown>[]
}): string {
  const parts: string[] = []
  if (params.thinking) parts.push(`<think>\n${params.thinking}\n</think>`)
  if (params.answer) parts.push(`<answer>\n${params.answer}\n</answer>`)
  if (params.tip) parts.push(`<tip>\n${params.tip}\n</tip>`)
  if (params.widgets) {
    parts.push(`<schema>\n${JSON.stringify({ type: 'schema_update', widgets: params.widgets })}\n</schema>`)
  }
  return parts.join('\n\n')
}

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  process.env.DEEPSEEK_API_KEY = 'test-key'
})

describe('streamEditorAgent', () => {
  async function loadStreamEditorAgent() {
    vi.doMock('openai', () => ({
      default: vi.fn().mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      })),
    }))
    vi.doMock('../tools/widgetTools.js', () => ({
      validateSchema: vi.fn(() => ({ valid: true, errors: [] })),
    }))
    vi.doMock('../tools/editorTools.js', () => ({
      EDITOR_TOOLS: [
        { type: 'function', function: { name: 'search_schemas', description: 'Search schemas', parameters: { type: 'object', properties: {} } } },
      ],
      executeEditorTool: vi.fn(async (name: string) => {
        if (name === 'search_schemas') return { success: true, data: { total: 1, schemas: [] } }
        return { success: false, error: 'Unknown tool' }
      }),
    }))
    const mod = await import('../graph/editorAgent.js')
    return mod.streamEditorAgent
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

  it('yields thinking events in real-time', async () => {
    const streamEditorAgent = await loadStreamEditorAgent()

    const fullOutput = buildStructuredOutput({
      thinking: '分析需求',
      answer: '已生成',
    })

    const chunks = fullOutput.split('').map((char) => ({
      choices: [{ delta: { content: char } }],
    }))

    mockCreate.mockResolvedValue(makeAsyncIterable(chunks))

    const events: Array<{ type: string; content?: string }> = []
    for await (const event of streamEditorAgent(makeState('test'))) {
      events.push(event)
    }

    const thinkingEvents = events.filter((e) => e.type === 'thinking')
    expect(thinkingEvents.length).toBeGreaterThan(0)

    const textEvents = events.filter((e) => e.type === 'text')
    expect(textEvents.length).toBe(1)
    expect(textEvents[0].content).toBe('已生成')
  })

  it('yields tip and schema events', async () => {
    const streamEditorAgent = await loadStreamEditorAgent()

    const fullOutput = buildStructuredOutput({
      thinking: '思考',
      answer: '回答',
      tip: '建议',
      widgets: [{ id: 'w1', type: 'input', field: 'name', label: 'Name', props: {}, position: { x: 0, y: 0, w: 12, h: 2 } }],
    })

    const chunks = fullOutput.split('').map((char) => ({
      choices: [{ delta: { content: char } }],
    }))

    mockCreate.mockResolvedValue(makeAsyncIterable(chunks))

    const events: Array<{ type: string; content?: string; payload?: unknown }> = []
    for await (const event of streamEditorAgent(makeState('test'))) {
      events.push(event)
    }

    expect(events.some((e) => e.type === 'tip')).toBe(true)
    expect(events.some((e) => e.type === 'schema')).toBe(true)
  })

  it('yields tool_call events and continues generation', async () => {
    const streamEditorAgent = await loadStreamEditorAgent()

    const toolCallStream = makeAsyncIterable([
      { choices: [{ delta: { tool_calls: [{ index: 0, id: 'tc-1', function: { name: 'search_schemas', arguments: '{"key' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'word":"用户"}' } }] } }] },
    ])

    const answerOutput = buildStructuredOutput({ answer: '已找到表单' })
    const answerStream = makeAsyncIterable(
      answerOutput.split('').map((char) => ({ choices: [{ delta: { content: char } }] })),
    )

    mockCreate
      .mockResolvedValueOnce(toolCallStream)
      .mockResolvedValueOnce(answerStream)

    const events: Array<{ type: string; toolCalls?: unknown[]; toolResults?: unknown[]; content?: string }> = []
    for await (const event of streamEditorAgent(makeState('查找用户表单'))) {
      events.push(event)
    }

    const toolCallEvents = events.filter((e) => e.type === 'tool_call')
    expect(toolCallEvents.length).toBe(2)

    const callingEvent = toolCallEvents.find((e) => e.toolCalls)
    expect(callingEvent).toBeDefined()
    expect(callingEvent!.toolCalls![0].name).toBe('search_schemas')

    const resultEvent = toolCallEvents.find((e) => e.toolResults)
    expect(resultEvent).toBeDefined()

    const textEvents = events.filter((e) => e.type === 'text')
    expect(textEvents.length).toBe(1)
    expect(textEvents[0].content).toBe('已找到表单')
  })

  it('includes current schema in prompt when provided', async () => {
    const streamEditorAgent = await loadStreamEditorAgent()

    const fullOutput = buildStructuredOutput({ answer: 'ok' })
    const chunks = fullOutput.split('').map((char) => ({
      choices: [{ delta: { content: char } }],
    }))

    mockCreate.mockResolvedValue(makeAsyncIterable(chunks))

    const currentSchema = [{ id: 'existing', type: 'input', field: 'email' }]
    const events: Array<{ type: string }> = []
    for await (const event of streamEditorAgent(makeState('修改表单', currentSchema))) {
      events.push(event)
    }

    const userMsg = mockCreate.mock.calls[0][0].messages[1]
    expect(userMsg.content).toContain('当前已有 Schema')
  })

  it('calls OpenAI with correct model and params', async () => {
    const streamEditorAgent = await loadStreamEditorAgent()

    const fullOutput = buildStructuredOutput({ answer: 'ok' })
    const chunks = fullOutput.split('').map((char) => ({
      choices: [{ delta: { content: char } }],
    }))

    mockCreate.mockResolvedValue(makeAsyncIterable(chunks))

    const events: Array<{ type: string }> = []
    for await (const event of streamEditorAgent(makeState('test'))) {
      events.push(event)
    }

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'deepseek-chat',
        temperature: 0.7,
        max_tokens: 8192,
        tool_choice: 'auto',
        stream: true,
        messages: expect.arrayContaining([
          { role: 'system', content: expect.any(String) },
          { role: 'user', content: 'test' },
        ]),
      }),
    )
  })
})
