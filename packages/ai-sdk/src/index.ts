/**
 * @schema-form/ai-sdk
 *
 * 独立可复用的 Agent SDK，与 LangGraph 解耦。
 *
 * 核心能力：
 * - BaseAgent 基类：LLM 调用、工具执行、流式响应
 * - ToolRegistry：工具注册与管理
 * - PromptBuilder：结构化 prompt 构建
 * - 类型定义：完整的 TypeScript 类型支持
 *
 * @example
 * ```ts
 * import { BaseAgent, buildTool, PromptBuilder } from '@schema-form/ai-sdk'
 *
 * // 1. 定义工具
 * const searchTool = buildTool()
 *   .name('search')
 *   .description('搜索数据')
 *   .parameters(b => b.string('query', '搜索关键词', { required: true }))
 *   .execute(async (params) => {
 *     return { results: [] }
 *   })
 *   .build()
 *
 * // 2. 创建 Agent
 * class MyAgent extends BaseAgent {
 *   constructor() {
 *     super({
 *       name: 'MyAgent',
 *       description: '自定义 Agent',
 *       systemPrompt: '你是一个...',
 *       llm: { provider: 'deepseek', model: 'deepseek-v4-pro' },
 *       tools: [searchTool],
 *     })
 *   }
 * }
 *
 * // 3. 执行
 * const agent = new MyAgent()
 * const result = await agent.execute('帮我搜索...', {
 *   conversationId: 'conv-123',
 *   variables: {},
 * })
 * console.log(result.content)
 * ```
 */

// ────────────────────────────────────────────
// 核心类
// ────────────────────────────────────────────

export { BaseAgent } from './agent.js'
export { ToolRegistry, createToolRegistry, createTool, buildTool } from './tool.js'
export { PromptBuilder, createPromptBuilder } from './promptBuilder.js'

// ────────────────────────────────────────────
// 示例 Agent
// ────────────────────────────────────────────

export { SchemaAgent } from './examples/schemaAgent.js'

// ────────────────────────────────────────────
// 类型（全部 re-export）
// ────────────────────────────────────────────

export type {
  // 配置
  AgentConfig,
  LLMConfig,
  LLMProvider,

  // 工具
  ToolDefinition,
  ToolParameterDefinition,
  ToolExecutionContext,

  // 消息
  Message,
  MessageRole,
  ToolCall,

  // 结果
  AgentResult,

  // 流式
  StreamEvent,
  StreamEventType,
} from './types.js'
