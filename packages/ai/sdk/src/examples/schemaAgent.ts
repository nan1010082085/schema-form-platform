/**
 * SchemaAgent 示例
 *
 * 演示如何使用 Agent SDK 创建一个表单 Schema 生成 Agent。
 */

import { BaseAgent } from '../agent.js'
import { buildTool } from '../tool.js'
import { PromptBuilder } from '../promptBuilder.js'
import type { AgentConfig, ToolExecutionContext } from '../types.js'

// ────────────────────────────────────────────
// 示例工具
// ────────────────────────────────────────────

/** 搜索 Schema 工具 */
const searchSchemasTool = buildTool()
  .name('search_schemas')
  .description('搜索已有的表单 Schema')
  .parameters(b =>
    b.string('keyword', '搜索关键词', { required: true })
      .number('limit', '返回数量限制', { default: 10 })
  )
  .execute(async (params, context) => {
    // 示例：实际使用时应调用数据库或 API
    console.log(`[${context.conversationId}] Searching schemas:`, params.keyword)
    return {
      schemas: [
        { id: '1', name: '用户信息表单', type: 'form' },
        { id: '2', name: '订单列表', type: 'search_list' },
      ],
      total: 2,
    }
  })
  .build()

/** 获取 Widget 目录工具 */
const getWidgetCatalogueTool = buildTool()
  .name('get_widget_catalogue')
  .description('获取可用的 Widget 组件目录')
  .parameters(b =>
    b.string('group', '组件分组（form/layout/container/table 等）')
  )
  .execute(async (params) => {
    // 示例：返回简化的组件目录
    const widgets = [
      { type: 'input', group: 'form', description: '文本输入框' },
      { type: 'select', group: 'form', description: '下拉选择器' },
      { type: 'form', group: 'container', description: '表单容器' },
      { type: 'table', group: 'table', description: '数据表格' },
    ]

    if (params.group) {
      return widgets.filter(w => w.group === params.group)
    }
    return widgets
  })
  .build()

// ────────────────────────────────────────────
// SchemaAgent
// ────────────────────────────────────────────

/**
 * SchemaAgent — 表单 Schema 生成 Agent
 *
 * 功能：
 * - 根据用户描述生成表单 Schema
 * - 搜索已有 Schema 进行复用
 * - 查询 Widget 组件目录
 *
 * @example
 * ```ts
 * const agent = new SchemaAgent({
 *   llm: {
 *     provider: 'deepseek',
 *     model: 'deepseek-v4-pro',
 *     apiKey: 'your-api-key',
 *   }
 * })
 *
 * const result = await agent.generate('创建一个用户注册表单', {
 *   conversationId: 'conv-123',
 *   variables: {},
 * })
 *
 * console.log(result.content)
 * ```
 */
export class SchemaAgent extends BaseAgent {
  constructor(config: Pick<AgentConfig, 'llm'> & Partial<Pick<AgentConfig, 'maxToolRounds' | 'maxHistoryMessages'>>) {
    const systemPrompt = new PromptBuilder()
      .role('你是表单 Schema 生成专家。你精通整个 Widget 体系，能根据用户需求生成高质量的 Widget Schema JSON。')
      .rules([
        '基础组件只能嵌套在布局/容器组件内，禁止基础组件互相嵌套',
        '每个 Widget 必须有 position（x, y, w, h, zIndex）',
        'id 格式：{type}_{5位hash}，如 input_abc12',
        'field 命名：camelCase，语义化',
        '容器必须有 children，即使为空',
        '表单字段必须有 field 和 label',
      ])
      .tools([searchSchemasTool, getWidgetCatalogueTool])
      .outputFormat([
        '严格按以下结构输出：',
        '',
        '```json',
        '{',
        '  "widgets": [...]',
        '}',
        '```',
      ].join('\n'))
      .build()

    super({
      name: 'SchemaAgent',
      description: '表单 Schema 生成 Agent',
      systemPrompt,
      llm: config.llm,
      tools: [searchSchemasTool, getWidgetCatalogueTool],
      ...(config.maxToolRounds && { maxToolRounds: config.maxToolRounds }),
      ...(config.maxHistoryMessages && { maxHistoryMessages: config.maxHistoryMessages }),
    })
  }

  /**
   * 生成 Schema
   *
   * @param userMessage - 用户需求描述
   * @param context - 执行上下文
   * @returns Agent 执行结果
   */
  async generate(userMessage: string, context: ToolExecutionContext) {
    return this.execute(userMessage, context)
  }

  /**
   * 流式生成 Schema
   *
   * @param userMessage - 用户需求描述
   * @param context - 执行上下文
   * @yields 流式事件
   */
  async *generateStream(userMessage: string, context: ToolExecutionContext) {
    yield* this.executeStream(userMessage, context)
  }
}
