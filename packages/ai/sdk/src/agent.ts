/**
 * Agent 基类
 *
 * 提供 LLM 调用、工具执行、流式响应等核心能力。
 * 与 LangGraph 解耦，可独立使用。
 */

import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import type {
  AgentConfig,
  AgentResult,
  Message,
  ToolCall,
  StreamEvent,
  ToolExecutionContext,
  LLMConfig,
} from './types.js'
import { ToolRegistry, createToolRegistry } from './tool.js'

// ────────────────────────────────────────────
// 默认配置
// ────────────────────────────────────────────

const DEFAULT_MAX_TOOL_ROUNDS = 10
const DEFAULT_MAX_HISTORY_MESSAGES = 20

// ────────────────────────────────────────────
// LLM 客户端工厂
// ────────────────────────────────────────────

function createLLMClient(config: LLMConfig): OpenAI {
  const apiKey = config.apiKey ?? process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'API key is required. Set it in LLMConfig.apiKey or environment variable DEEPSEEK_API_KEY / OPENAI_API_KEY',
    )
  }

  let baseURL: string
  switch (config.provider) {
    case 'deepseek':
      baseURL = 'https://api.deepseek.com'
      break
    case 'openai':
      baseURL = 'https://api.openai.com/v1'
      break
    case 'custom':
      if (!config.baseURL) {
        throw new Error('baseURL is required for custom provider')
      }
      baseURL = config.baseURL
      break
  }

  return new OpenAI({ apiKey, baseURL })
}

// ────────────────────────────────────────────
// Agent 基类
// ────────────────────────────────────────────

/**
 * Agent 基类
 *
 * 提供完整的 Agent 执行能力：
 * - LLM 调用（DeepSeek / OpenAI / 自定义）
 * - 工具注册与执行
 * - 多轮工具调用循环
 * - 流式响应
 * - 消息历史管理
 * - 性能监控钩子
 */
export abstract class BaseAgent {
  protected readonly config: AgentConfig
  protected readonly client: OpenAI
  protected readonly toolRegistry: ToolRegistry
  protected readonly maxToolRounds: number
  protected readonly maxHistoryMessages: number

  constructor(config: AgentConfig) {
    this.config = config
    this.client = createLLMClient(config.llm)
    this.toolRegistry = createToolRegistry(config.tools)
    this.maxToolRounds = config.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS
    this.maxHistoryMessages = config.maxHistoryMessages ?? DEFAULT_MAX_HISTORY_MESSAGES
  }

  // ──────────────────────────────────────────
  // 公共 API
  // ──────────────────────────────────────────

  /**
   * 执行 Agent（非流式）
   *
   * @param userMessage - 用户消息
   * @param context - 执行上下文
   * @param history - 历史消息（可选）
   * @returns Agent 执行结果
   */
  async execute(
    userMessage: string,
    context: ToolExecutionContext,
    history?: Message[],
  ): Promise<AgentResult> {
    const messages = this.buildMessages(userMessage, history)
    const toolCallsLog: AgentResult['toolCalls'] = []
    let truncated = false
    let totalUsage = { prompt: 0, completion: 0, total: 0 }

    for (let round = 0; round < this.maxToolRounds; round++) {
      const startTime = Date.now()

      // 调用 LLM
      const response = await this.callLLM(messages)

      // 累计 usage
      if (response.usage) {
        totalUsage.prompt += response.usage.prompt_tokens ?? 0
        totalUsage.completion += response.usage.completion_tokens ?? 0
        totalUsage.total += response.usage.total_tokens ?? 0
      }

      const assistantMessage = response.choices[0]?.message
      if (!assistantMessage) {
        throw new Error('Empty response from LLM')
      }

      // 添加 assistant 消息到历史
      const assistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: assistantMessage.content ?? '',
        timestamp: new Date(),
        ...(assistantMessage.tool_calls && {
          toolCalls: assistantMessage.tool_calls.map(tc => ({
            id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          })),
        }),
      }
      messages.push(assistantMsg)

      // 如果没有工具调用，返回结果
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        return {
          content: assistantMessage.content ?? '',
          messages,
          toolCalls: toolCallsLog,
          truncated: false,
          usage: totalUsage,
        }
      }

      // 执行工具调用
      for (const toolCall of assistantMessage.tool_calls) {
        const toolStartTime = Date.now()
        const toolResult = await this.executeToolCall(toolCall, context)
        const toolDuration = Date.now() - toolStartTime

        toolCallsLog.push({
          name: toolCall.function.name,
          params: JSON.parse(toolCall.function.arguments),
          result: toolResult,
          duration: toolDuration,
        })

        // 添加工具结果到消息历史
        messages.push({
          id: uuidv4(),
          role: 'tool',
          content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          timestamp: new Date(),
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
        })
      }

      // 检查是否达到最大轮次
      if (round === this.maxToolRounds - 1) {
        truncated = true
      }
    }

    // 达到最大轮次，返回当前最后一条 assistant 消息
    const lastAssistant = messages.filter(m => m.role === 'assistant').pop()
    return {
      content: lastAssistant?.content ?? '',
      messages,
      toolCalls: toolCallsLog,
      truncated,
      usage: totalUsage,
    }
  }

  /**
   * 执行 Agent（流式）
   *
   * @param userMessage - 用户消息
   * @param context - 执行上下文
   * @param history - 历史消息（可选）
   * @yields 流式事件
   */
  async *executeStream(
    userMessage: string,
    context: ToolExecutionContext,
    history?: Message[],
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const messages = this.buildMessages(userMessage, history)
    const toolCallsLog: AgentResult['toolCalls'] = []
    let totalUsage = { prompt: 0, completion: 0, total: 0 }
    let fullContent = ''

    for (let round = 0; round < this.maxToolRounds; round++) {
      // 流式调用 LLM
      const tools = this.toolRegistry.getAll().length > 0
        ? this.toolRegistry.toOpenAITools() as OpenAI.Chat.Completions.ChatCompletionTool[]
        : undefined

      const stream = await this.client.chat.completions.create({
        model: this.config.llm.model,
        messages: this.toOpenAIMessages(messages),
        ...(tools && { tools }),
        stream: true,
        temperature: this.config.llm.temperature,
        max_tokens: this.config.llm.maxTokens,
      })

      let assistantContent = ''
      const toolCallsAccumulator: Map<number, { id: string; name: string; arguments: string }> = new Map()

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        if (!delta) continue

        // 累计 usage
        if (chunk.usage) {
          totalUsage.prompt += chunk.usage.prompt_tokens ?? 0
          totalUsage.completion += chunk.usage.completion_tokens ?? 0
          totalUsage.total += chunk.usage.total_tokens ?? 0
        }

        // 文本增量
        if (delta.content) {
          assistantContent += delta.content
          fullContent += delta.content
          yield { type: 'text_delta', delta: delta.content }
        }

        // 工具调用增量
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index ?? 0
            if (!toolCallsAccumulator.has(index)) {
              toolCallsAccumulator.set(index, { id: '', name: '', arguments: '' })
            }
            const acc = toolCallsAccumulator.get(index)!
            if (tc.id) acc.id = tc.id
            if (tc.function?.name) acc.name = tc.function.name
            if (tc.function?.arguments) acc.arguments += tc.function.arguments
          }
        }
      }

      // 添加 assistant 消息
      const assistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      }

      // 处理工具调用
      if (toolCallsAccumulator.size > 0) {
        const toolCalls: ToolCall[] = []
        for (const acc of toolCallsAccumulator.values()) {
          toolCalls.push({ id: acc.id, name: acc.name, arguments: acc.arguments })
        }
        assistantMsg.toolCalls = toolCalls
        messages.push(assistantMsg)

        // 执行工具
        for (const tc of toolCalls) {
          yield {
            type: 'tool_call_start',
            toolCall: { id: tc.id, name: tc.name, arguments: tc.arguments },
          }

          const toolStartTime = Date.now()
          let toolResult: unknown
          try {
            toolResult = await this.executeToolCallDirect(tc, context)
          } catch (err) {
            toolResult = { error: err instanceof Error ? err.message : String(err) }
          }
          const toolDuration = Date.now() - toolStartTime

          toolCallsLog.push({
            name: tc.name,
            params: JSON.parse(tc.arguments),
            result: toolResult,
            duration: toolDuration,
          })

          yield {
            type: 'tool_call_end',
            toolCall: { id: tc.id, name: tc.name, result: toolResult },
          }

          // 添加工具结果到消息历史
          messages.push({
            id: uuidv4(),
            role: 'tool',
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
            timestamp: new Date(),
            toolCallId: tc.id,
            toolName: tc.name,
          })
        }

        // 继续下一轮
        continue
      }

      // 没有工具调用，完成
      messages.push(assistantMsg)

      yield {
        type: 'done',
        result: {
          content: fullContent,
          messages,
          toolCalls: toolCallsLog,
          truncated: false,
          usage: totalUsage,
        },
      }
      return
    }

    // 达到最大轮次
    yield {
      type: 'done',
      result: {
        content: fullContent,
        messages,
        toolCalls: toolCallsLog,
        truncated: true,
        usage: totalUsage,
      },
    }
  }

  /**
   * 获取已注册的工具列表
   */
  getTools(): Array<{ name: string; description: string }> {
    return this.toolRegistry.getAll().map(t => ({
      name: t.name,
      description: t.description,
    }))
  }

  // ──────────────────────────────────────────
  // 子类可覆盖的方法
  // ──────────────────────────────────────────

  /**
   * 构建用户消息（子类可覆盖以添加上下文）
   */
  protected buildUserMessage(userMessage: string, _context: ToolExecutionContext): string {
    return userMessage
  }

  // ──────────────────────────────────────────
  // 内部方法
  // ──────────────────────────────────────────

  private buildMessages(userMessage: string, history?: Message[]): Message[] {
    const messages: Message[] = []

    // 添加系统消息
    messages.push({
      id: uuidv4(),
      role: 'system',
      content: this.config.systemPrompt,
      timestamp: new Date(),
    })

    // 添加历史消息（截断）
    if (history && history.length > 0) {
      const truncatedHistory = history.length > this.maxHistoryMessages
        ? history.slice(-this.maxHistoryMessages)
        : history
      messages.push(...truncatedHistory)
    }

    // 添加用户消息
    messages.push({
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    })

    return messages
  }

  private toOpenAIMessages(messages: Message[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return { role: 'system', content: msg.content }
        case 'user':
          return { role: 'user', content: msg.content }
        case 'assistant':
          return {
            role: 'assistant',
            content: msg.content,
            ...(msg.toolCalls && {
              tool_calls: msg.toolCalls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: {
                  name: tc.name,
                  arguments: tc.arguments,
                },
              })),
            }),
          }
        case 'tool':
          return {
            role: 'tool',
            content: msg.content,
            tool_call_id: msg.toolCallId!,
          }
      }
    })
  }

  private async callLLM(messages: Message[]): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const tools = this.toolRegistry.getAll().length > 0
      ? this.toolRegistry.toOpenAITools() as OpenAI.Chat.Completions.ChatCompletionTool[]
      : undefined

    return this.client.chat.completions.create({
      model: this.config.llm.model,
      messages: this.toOpenAIMessages(messages),
      ...(tools && { tools }),
      temperature: this.config.llm.temperature,
      max_tokens: this.config.llm.maxTokens,
    })
  }

  private async executeToolCall(
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
    context: ToolExecutionContext,
  ): Promise<unknown> {
    const params = JSON.parse(toolCall.function.arguments)
    return this.toolRegistry.execute(toolCall.function.name, params, context)
  }

  private async executeToolCallDirect(
    toolCall: ToolCall,
    context: ToolExecutionContext,
  ): Promise<unknown> {
    const params = JSON.parse(toolCall.arguments)
    return this.toolRegistry.execute(toolCall.name, params, context)
  }
}
