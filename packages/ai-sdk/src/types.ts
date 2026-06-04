/**
 * @schema-form/ai-sdk — 核心类型定义
 *
 * Agent SDK 的类型系统，与 LangGraph 解耦，可独立使用。
 */

import { z } from 'zod'

// ────────────────────────────────────────────
// LLM 提供商配置
// ────────────────────────────────────────────

/** LLM 提供商类型 */
export type LLMProvider = 'deepseek' | 'openai' | 'custom'

/** LLM 配置 */
export interface LLMConfig {
  /** 提供商 */
  provider: LLMProvider
  /** API Key（优先级高于环境变量） */
  apiKey?: string
  /** 自定义 baseURL（custom 模式必填） */
  baseURL?: string
  /** 模型名称 */
  model: string
  /** 温度参数 */
  temperature?: number
  /** 最大 token 数 */
  maxTokens?: number
}

// ────────────────────────────────────────────
// 工具定义
// ────────────────────────────────────────────

/** 工具参数定义（JSON Schema 格式，兼容 OpenAI FunctionParameters） */
export interface ToolParameterDefinition {
  type: 'object'
  properties: Record<string, {
    type: string
    description: string
    enum?: string[]
    default?: unknown
  }>
  required?: string[]
  [key: string]: unknown // 允许额外字段，兼容 OpenAI FunctionParameters
}

/** 工具执行上下文 */
export interface ToolExecutionContext {
  /** 当前会话 ID */
  conversationId: string
  /** 用户 ID */
  userId?: string
  /** 额外上下文变量 */
  variables: Record<string, unknown>
}

/** 工具定义 */
export interface ToolDefinition {
  /** 工具名称（唯一标识） */
  name: string
  /** 工具描述（供 LLM 理解） */
  description: string
  /** 参数定义 */
  parameters: ToolParameterDefinition
  /** 执行函数 */
  execute: (params: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>
}

// ────────────────────────────────────────────
// Agent 配置
// ────────────────────────────────────────────

/** Agent 配置 */
export interface AgentConfig {
  /** Agent 名称 */
  name: string
  /** Agent 描述 */
  description: string
  /** System prompt */
  systemPrompt: string
  /** LLM 配置 */
  llm: LLMConfig
  /** 可用工具列表 */
  tools?: ToolDefinition[]
  /** 最大工具调用轮次（防止无限循环） */
  maxToolRounds?: number
  /** 消息历史截断长度 */
  maxHistoryMessages?: number
}

// ────────────────────────────────────────────
// 消息类型
// ────────────────────────────────────────────

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

/** 消息 */
export interface Message {
  /** 消息 ID */
  id: string
  /** 角色 */
  role: MessageRole
  /** 内容 */
  content: string
  /** 时间戳 */
  timestamp: Date
  /** 工具调用信息（assistant 消息） */
  toolCalls?: ToolCall[]
  /** 工具调用 ID（tool 消息） */
  toolCallId?: string
  /** 工具名称（tool 消息） */
  toolName?: string
}

/** 工具调用 */
export interface ToolCall {
  /** 调用 ID */
  id: string
  /** 工具名称 */
  name: string
  /** 参数（JSON 字符串） */
  arguments: string
}

// ────────────────────────────────────────────
// Agent 执行结果
// ────────────────────────────────────────────

/** Agent 执行结果 */
export interface AgentResult {
  /** 最终文本响应 */
  content: string
  /** 完整消息历史 */
  messages: Message[]
  /** 工具调用记录 */
  toolCalls: Array<{
    name: string
    params: Record<string, unknown>
    result: unknown
    duration: number
  }>
  /** 是否因达到最大轮次而终止 */
  truncated: boolean
  /** Token 使用统计 */
  usage?: {
    prompt: number
    completion: number
    total: number
  }
}

// ────────────────────────────────────────────
// 流式事件
// ────────────────────────────────────────────

/** 流式事件类型 */
export type StreamEventType =
  | 'text_delta'
  | 'tool_call_start'
  | 'tool_call_end'
  | 'error'
  | 'done'

/** 流式事件 */
export interface StreamEvent {
  type: StreamEventType
  /** 文本增量（text_delta） */
  delta?: string
  /** 工具调用信息（tool_call_start/end） */
  toolCall?: {
    id: string
    name: string
    arguments?: string
    result?: unknown
  }
  /** 错误信息（error） */
  error?: string
  /** 最终结果（done） */
  result?: AgentResult
}

// ────────────────────────────────────────────
// Zod schemas（用于运行时校验）
// ────────────────────────────────────────────

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  timestamp: z.date(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.string(),
  })).optional(),
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
})

export const AgentConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  systemPrompt: z.string().min(1),
  llm: z.object({
    provider: z.enum(['deepseek', 'openai', 'custom']),
    apiKey: z.string().optional(),
    baseURL: z.string().optional(),
    model: z.string().min(1),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
  }),
  tools: z.array(z.object({
    name: z.string().min(1),
    description: z.string(),
    parameters: z.object({
      type: z.literal('object'),
      properties: z.record(z.object({
        type: z.string(),
        description: z.string(),
        enum: z.array(z.string()).optional(),
        default: z.unknown().optional(),
      })),
      required: z.array(z.string()).optional(),
    }),
  })).optional(),
  maxToolRounds: z.number().positive().optional(),
  maxHistoryMessages: z.number().positive().optional(),
})
