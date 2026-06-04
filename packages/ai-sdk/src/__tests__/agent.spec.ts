/**
 * Agent SDK 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseAgent } from '../agent.js'
import { buildTool, ToolRegistry, createToolRegistry, createTool } from '../tool.js'
import { PromptBuilder, createPromptBuilder } from '../promptBuilder.js'
import type { AgentConfig, ToolExecutionContext, Message } from '../types.js'

// ────────────────────────────────────────────
// Mock OpenAI
// ────────────────────────────────────────────

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                role: 'assistant',
                content: 'Mock response',
                tool_calls: null,
              },
            }],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
          }),
        },
      }
    },
  }
})

// ────────────────────────────────────────────
// 工具注册表测试
// ────────────────────────────────────────────

describe('ToolRegistry', () => {
  it('should register and retrieve tools', () => {
    const registry = new ToolRegistry()

    const tool = createTool({
      name: 'test_tool',
      description: 'A test tool',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
      execute: async (params) => `Result for ${params.query}`,
    })

    registry.register(tool)

    expect(registry.has('test_tool')).toBe(true)
    expect(registry.get('test_tool')).toBeDefined()
    expect(registry.getNames()).toEqual(['test_tool'])
  })

  it('should throw on duplicate registration', () => {
    const registry = new ToolRegistry()
    const tool = createTool({
      name: 'dup_tool',
      description: 'Duplicate',
      parameters: { type: 'object', properties: {} },
      execute: async () => null,
    })

    registry.register(tool)
    expect(() => registry.register(tool)).toThrow('already registered')
  })

  it('should batch register tools', () => {
    const registry = new ToolRegistry()
    const tools = [
      createTool({
        name: 'tool_1',
        description: 'Tool 1',
        parameters: { type: 'object', properties: {} },
        execute: async () => null,
      }),
      createTool({
        name: 'tool_2',
        description: 'Tool 2',
        parameters: { type: 'object', properties: {} },
        execute: async () => null,
      }),
    ]

    registry.registerAll(tools)
    expect(registry.getNames()).toEqual(['tool_1', 'tool_2'])
  })

  it('should convert to OpenAI tools format', () => {
    const registry = new ToolRegistry()
    registry.register(createTool({
      name: 'search',
      description: 'Search data',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Query' },
        },
        required: ['query'],
      },
      execute: async () => null,
    }))

    const openAITools = registry.toOpenAITools()
    expect(openAITools).toHaveLength(1)
    expect(openAITools[0]).toEqual({
      type: 'function',
      function: {
        name: 'search',
        description: 'Search data',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Query' },
          },
          required: ['query'],
        },
      },
    })
  })

  it('should execute tools', async () => {
    const registry = new ToolRegistry()
    const executeFn = vi.fn().mockResolvedValue({ id: '123' })

    registry.register(createTool({
      name: 'create',
      description: 'Create item',
      parameters: { type: 'object', properties: {} },
      execute: executeFn,
    }))

    const context: ToolExecutionContext = {
      conversationId: 'conv-123',
      variables: {},
    }

    const result = await registry.execute('create', { name: 'test' }, context)
    expect(executeFn).toHaveBeenCalledWith({ name: 'test' }, context)
    expect(result).toEqual({ id: '123' })
  })

  it('should throw for unknown tool execution', async () => {
    const registry = new ToolRegistry()
    const context: ToolExecutionContext = {
      conversationId: 'conv-123',
      variables: {},
    }

    await expect(registry.execute('unknown', {}, context)).rejects.toThrow('not found')
  })
})

// ────────────────────────────────────────────
// 工具构建器测试
// ────────────────────────────────────────────

describe('buildTool', () => {
  it('should build tool with fluent API', () => {
    const tool = buildTool()
      .name('search')
      .description('Search for items')
      .parameters(b =>
        b.string('query', 'Search keyword', { required: true })
          .number('limit', 'Result limit', { default: 10 })
          .boolean('verbose', 'Verbose output')
      )
      .execute(async (params) => `Found ${params.query}`)
      .build()

    expect(tool.name).toBe('search')
    expect(tool.description).toBe('Search for items')
    expect(tool.parameters.required).toEqual(['query'])
    expect(tool.parameters.properties.query.type).toBe('string')
    expect(tool.parameters.properties.limit.default).toBe(10)
  })

  it('should throw if name is missing', () => {
    expect(() =>
      buildTool()
        .description('No name')
        .parameters(b => b)
        .execute(async () => null)
        .build()
    ).toThrow('name is required')
  })

  it('should throw if description is missing', () => {
    expect(() =>
      buildTool()
        .name('test')
        .parameters(b => b)
        .execute(async () => null)
        .build()
    ).toThrow('description is required')
  })
})

// ────────────────────────────────────────────
// PromptBuilder 测试
// ────────────────────────────────────────────

describe('PromptBuilder', () => {
  it('should build structured prompt', () => {
    const prompt = new PromptBuilder()
      .role('你是一个表单设计专家')
      .context('系统有 49 种 Widget')
      .rules([
        '组件只能嵌套在容器内',
        '每个 Widget 必须有 position',
      ])
      .outputFormat('JSON')
      .build()

    expect(prompt).toContain('你是一个表单设计专家')
    expect(prompt).toContain('## 上下文')
    expect(prompt).toContain('系统有 49 种 Widget')
    expect(prompt).toContain('## 规则')
    expect(prompt).toContain('1. 组件只能嵌套在容器内')
    expect(prompt).toContain('## 输出格式')
    expect(prompt).toContain('JSON')
  })

  it('should handle tools section', () => {
    const tools = [
      createTool({
        name: 'search',
        description: '搜索数据',
        parameters: { type: 'object', properties: {} },
        execute: async () => null,
      }),
    ]

    const prompt = new PromptBuilder()
      .role('Agent')
      .tools(tools)
      .build()

    expect(prompt).toContain('## 可用工具')
    expect(prompt).toContain('- **search**: 搜索数据')
  })

  it('should handle examples', () => {
    const prompt = new PromptBuilder()
      .role('Agent')
      .examples([
        { input: '创建表单', output: '{"widgets": []}' },
      ])
      .build()

    expect(prompt).toContain('## 示例')
    expect(prompt).toContain('**输入**: 创建表单')
  })
})

// ────────────────────────────────────────────
// BaseAgent 测试
// ────────────────────────────────────────────

describe('BaseAgent', () => {
  class TestAgent extends BaseAgent {
    constructor() {
      super({
        name: 'TestAgent',
        description: 'Test agent',
        systemPrompt: 'You are a test agent.',
        llm: {
          provider: 'deepseek',
          model: 'deepseek-v4-pro',
          apiKey: 'test-key',
        },
        tools: [
          createTool({
            name: 'echo',
            description: 'Echo input',
            parameters: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Message to echo' },
              },
            },
            execute: async (params) => `Echo: ${params.message}`,
          }),
        ],
      })
    }
  }

  it('should create agent with config', () => {
    const agent = new TestAgent()
    expect(agent.getTools()).toHaveLength(1)
    expect(agent.getTools()[0].name).toBe('echo')
  })

  it('should execute and return result', async () => {
    const agent = new TestAgent()
    const context: ToolExecutionContext = {
      conversationId: 'conv-123',
      variables: {},
    }

    const result = await agent.execute('Hello', context)

    expect(result.content).toBe('Mock response')
    expect(result.messages.length).toBeGreaterThan(0)
    expect(result.truncated).toBe(false)
  })
})
