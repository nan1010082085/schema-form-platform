/**
 * 工具构建器
 *
 * 提供便捷的工具定义和构建方法。
 */

import type {
  ToolDefinition,
  ToolParameterDefinition,
  ToolExecutionContext,
} from './types.js'

// ────────────────────────────────────────────
// 工具构建器
// ────────────────────────────────────────────

/** 工具参数构建器 */
class ToolParameterBuilder {
  private properties: Record<string, {
    type: string
    description: string
    enum?: string[]
    default?: unknown
  }> = {}
  private requiredFields: string[] = []

  /** 添加字符串参数 */
  string(name: string, description: string, options?: { required?: boolean; enum?: string[]; default?: string }): this {
    this.properties[name] = {
      type: 'string',
      description,
      ...(options?.enum && { enum: options.enum }),
      ...(options?.default !== undefined && { default: options.default }),
    }
    if (options?.required) {
      this.requiredFields.push(name)
    }
    return this
  }

  /** 添加数字参数 */
  number(name: string, description: string, options?: { required?: boolean; default?: number }): this {
    this.properties[name] = {
      type: 'number',
      description,
      ...(options?.default !== undefined && { default: options.default }),
    }
    if (options?.required) {
      this.requiredFields.push(name)
    }
    return this
  }

  /** 添加布尔参数 */
  boolean(name: string, description: string, options?: { required?: boolean; default?: boolean }): this {
    this.properties[name] = {
      type: 'boolean',
      description,
      ...(options?.default !== undefined && { default: options.default }),
    }
    if (options?.required) {
      this.requiredFields.push(name)
    }
    return this
  }

  /** 添加数组参数 */
  array(name: string, description: string, options?: { required?: boolean }): this {
    this.properties[name] = {
      type: 'array',
      description,
    }
    if (options?.required) {
      this.requiredFields.push(name)
    }
    return this
  }

  /** 添加对象参数 */
  object(name: string, description: string, options?: { required?: boolean }): this {
    this.properties[name] = {
      type: 'object',
      description,
    }
    if (options?.required) {
      this.requiredFields.push(name)
    }
    return this
  }

  /** 构建参数定义 */
  build(): ToolParameterDefinition {
    return {
      type: 'object',
      properties: this.properties,
      ...(this.requiredFields.length > 0 && { required: this.requiredFields }),
    }
  }
}

/** 工具构建器 */
class ToolBuilder {
  private _name = ''
  private _description = ''
  private _parameters: ToolParameterDefinition = { type: 'object', properties: {} }
  private _execute: (params: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown> = async () => null

  /** 设置工具名称 */
  name(name: string): this {
    this._name = name
    return this
  }

  /** 设置工具描述 */
  description(description: string): this {
    this._description = description
    return this
  }

  /** 设置参数（使用构建器） */
  parameters(build: (builder: ToolParameterBuilder) => ToolParameterBuilder): this {
    const builder = new ToolParameterBuilder()
    this._parameters = build(builder).build()
    return this
  }

  /** 设置执行函数 */
  execute(fn: (params: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>): this {
    this._execute = fn
    return this
  }

  /** 构建工具定义 */
  build(): ToolDefinition {
    if (!this._name) {
      throw new Error('Tool name is required')
    }
    if (!this._description) {
      throw new Error('Tool description is required')
    }

    return {
      name: this._name,
      description: this._description,
      parameters: this._parameters,
      execute: this._execute,
    }
  }
}

// ────────────────────────────────────────────
// 快捷工具创建函数
// ────────────────────────────────────────────

/**
 * 创建工具定义
 *
 * @example
 * ```ts
 * const searchTool = createTool({
 *   name: 'search',
 *   description: '搜索数据',
 *   parameters: {
 *     type: 'object',
 *     properties: {
 *       query: { type: 'string', description: '搜索关键词' }
 *     },
 *     required: ['query']
 *   },
 *   execute: async (params) => {
 *     return await searchData(params.query as string)
 *   }
 * })
 * ```
 */
export function createTool(config: ToolDefinition): ToolDefinition {
  return config
}

/**
 * 使用构建器创建工具
 *
 * @example
 * ```ts
 * const searchTool = buildTool()
 *   .name('search')
 *   .description('搜索数据')
 *   .parameters(b => b.string('query', '搜索关键词', { required: true }))
 *   .execute(async (params) => {
 *     return await searchData(params.query as string)
 *   })
 *   .build()
 * ```
 */
export function buildTool(): ToolBuilder {
  return new ToolBuilder()
}

// ────────────────────────────────────────────
// 工具注册表
// ────────────────────────────────────────────

/** 工具注册表 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>()

  /** 注册工具 */
  register(tool: ToolDefinition): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`)
    }
    this.tools.set(tool.name, tool)
    return this
  }

  /** 批量注册 */
  registerAll(tools: ToolDefinition[]): this {
    for (const tool of tools) {
      this.register(tool)
    }
    return this
  }

  /** 获取工具 */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  /** 检查工具是否存在 */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /** 获取所有工具 */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /** 获取工具名称列表 */
  getNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /** 转换为 OpenAI tools 格式 */
  toOpenAITools(): Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: ToolParameterDefinition
    }
  }> {
    return this.getAll().map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  /** 执行工具 */
  async execute(
    name: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<unknown> {
    const tool = this.tools.get(name)
    if (!tool) {
      throw new Error(`Tool "${name}" not found`)
    }
    return tool.execute(params, context)
  }
}

/**
 * 创建工具注册表
 */
export function createToolRegistry(tools?: ToolDefinition[]): ToolRegistry {
  const registry = new ToolRegistry()
  if (tools) {
    registry.registerAll(tools)
  }
  return registry
}
