/**
 * Tool Registry — 工具调用协议核心
 *
 * 提供统一的工具注册、发现和执行接口。
 * 工具定义遵循 JSON Schema 规范，支持参数校验和执行。
 */

// ─── Tool Definition Types ─────────────────────────────────────

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required?: boolean
  default?: unknown
  enum?: unknown[]
  items?: ToolParameter
  properties?: Record<string, ToolParameter>
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: ToolParameter[]
  handler: (params: Record<string, unknown>) => Promise<ToolResult>
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  summary?: string
}

// ─── Tool Registry Class ───────────────────────────────────────

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>()

  /**
   * Register a tool definition.
   * Throws if a tool with the same name is already registered.
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`)
    }
    this.tools.set(tool.name, tool)
  }

  /**
   * Execute a tool by name with the given parameters.
   * Validates required parameters before execution.
   */
  async execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(toolName)
    if (!tool) {
      return { success: false, error: `Tool "${toolName}" not found` }
    }

    // Validate required parameters
    const missingParams = tool.parameters
      .filter(p => p.required && !(p.name in params))
      .map(p => p.name)

    if (missingParams.length > 0) {
      return {
        success: false,
        error: `Missing required parameters: ${missingParams.join(', ')}`,
      }
    }

    try {
      return await tool.handler(params)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Tool execution failed: ${message}` }
    }
  }

  /**
   * Get a tool definition by name.
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  /**
   * List all registered tools.
   */
  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tool names only.
   */
  listToolNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Check if a tool is registered.
   */
  hasTool(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Unregister a tool by name.
   */
  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * Clear all registered tools.
   */
  clear(): void {
    this.tools.clear()
  }
}

// ─── Global Registry Instance ──────────────────────────────────

export const toolRegistry = new ToolRegistry()
