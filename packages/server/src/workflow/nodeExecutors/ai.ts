/**
 * AINodeExecutor — workflow node that invokes the AI agent system.
 *
 * Delegates to the existing LangGraph agent graph (pageAgent / flowAgent /
 * editorAgent) to perform AI-driven tasks within a workflow execution.
 *
 * Supported operations:
 *   - generate_schema: Generate a form/page Schema via the editor/page agent
 *   - generate_flow:   Generate a BPMN flow definition via the flow agent
 *   - analyze_data:    General analysis via the LLM (no tool calls)
 *
 * Node config (inputs):
 *   - prompt:    AI prompt (required, supports {{variable}} placeholders)
 *   - model:     Model override (optional, defaults to system default)
 *   - operation: One of the three operations above
 *   - context:   Additional context variables injected into the prompt
 *
 * Output variables:
 *   - result:           Raw AI text response
 *   - schema:           Generated Schema JSON (generate_schema only)
 *   - flowDefinition:   Generated flow graph { nodes, edges } (generate_flow only)
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { graph } from '../../ai/graph/graph.js'
import { getLLM } from '../../ai/services/llmCache.js'
import { NodeExecutor } from './NodeExecutor.js'
import type { NodeExecutionContext, NodeExecutionResult } from './NodeExecutor.js'

// ─── Operation types ─────────────────────────────────────────────

type AIOperation = 'generate_schema' | 'generate_flow' | 'analyze_data'

// ─── Input config shape ─────────────────────────────────────────

interface AINodeInputs {
  /** Operation type */
  operation: AIOperation
  /** AI prompt (supports {{variable}} placeholders) */
  prompt: string
  /** Model override (optional) */
  model?: string
  /** Additional context variables to inject into the prompt */
  context?: Record<string, unknown>
}

// ─── System prompts per operation ────────────────────────────────

const ANALYZE_SYSTEM_PROMPT = `你是一个数据分析助手。根据用户提供的数据和上下文，进行分析并返回结构化的分析结果。
请直接输出分析结论，不要调用工具。`

// ─── AINodeExecutor ──────────────────────────────────────────────

/**
 * AI Node Executor — invokes the LangGraph agent graph for AI tasks.
 *
 * For generate_schema and generate_flow, the full agent graph is used
 * (including tool calls for schema/flow creation). For analyze_data,
 * a direct LLM call is made without tools.
 */
export class AINodeExecutor extends NodeExecutor {
  async execute(
    inputs: Record<string, unknown>,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = inputs as unknown as AINodeInputs
    const operation: AIOperation = config.operation ?? 'analyze_data'

    if (!config.prompt || typeof config.prompt !== 'string' || config.prompt.trim().length === 0) {
      return { success: false, error: 'Field "prompt" is required and must be a non-empty string' }
    }

    // Resolve {{variable}} placeholders in the prompt
    const resolvedPrompt = this.resolveTemplate(config.prompt, context.variables)

    // Build full prompt with optional context
    const fullPrompt = this.buildFullPrompt(resolvedPrompt, config.context, context.variables)

    switch (operation) {
      case 'generate_schema':
        return this.generateSchema(fullPrompt, config.model, context)
      case 'generate_flow':
        return this.generateFlow(fullPrompt, config.model, context)
      case 'analyze_data':
        return this.analyzeData(fullPrompt, config.model)
      default:
        return { success: false, error: `Unknown AI operation: ${operation}` }
    }
  }

  // ── generate_schema ─────────────────────────────────────────────

  /**
   * Generate a Schema via the LangGraph agent graph.
   * Routes to the page agent (for list/dashboard) or editor agent (for forms).
   */
  private async generateSchema(
    prompt: string,
    model: string | undefined,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const conversationId = `workflow-${context.instance._id}-${context.nodeId}`

    // Invoke the graph with source='page' to route to page agent
    // which has schema generation tools
    const graphInput = {
      messages: [new HumanMessage(prompt)],
      context: {
        source: 'page' as const,
        turnCount: 1,
      },
      session: {
        id: conversationId,
        conversationId,
        currentAgent: 'router' as const,
      },
      task: {
        type: 'generate_simple',
        chain: [],
        currentStepIndex: 0,
        intermediateResults: [],
        currentVersion: 0,
      },
      tools: {
        needsTool: true,
        results: [],
        toolIterationCount: 0,
      },
      error: null,
      interaction: {
        clarificationRequest: null,
        clarificationOptions: [],
        preferences: {},
        historySummary: '',
        collaborationRequest: null,
        collaborationHistory: [],
      },
    }

    try {
      const result = await graph.invoke(graphInput, {
        configurable: { thread_id: conversationId },
        recursionLimit: 15,
      })

      // Extract the final AI message content
      const lastMessage = result.messages[result.messages.length - 1]
      const content = this.extractContent(lastMessage)

      // Try to extract schema JSON from tool results
      const schema = this.extractSchemaFromResult(result)

      return {
        success: true,
        output: {
          result: content,
          schema: schema ?? null,
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: `AI schema generation failed: ${message}` }
    }
  }

  // ── generate_flow ───────────────────────────────────────────────

  /**
   * Generate a flow definition via the LangGraph agent graph.
   * Routes to the flow agent which has flow creation tools.
   */
  private async generateFlow(
    prompt: string,
    model: string | undefined,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const conversationId = `workflow-${context.instance._id}-${context.nodeId}`

    const graphInput = {
      messages: [new HumanMessage(prompt)],
      context: {
        source: 'flow' as const,
        turnCount: 1,
      },
      session: {
        id: conversationId,
        conversationId,
        currentAgent: 'router' as const,
      },
      task: {
        type: 'generate_simple',
        chain: [],
        currentStepIndex: 0,
        intermediateResults: [],
        currentVersion: 0,
      },
      tools: {
        needsTool: true,
        results: [],
        toolIterationCount: 0,
      },
      error: null,
      interaction: {
        clarificationRequest: null,
        clarificationOptions: [],
        preferences: {},
        historySummary: '',
        collaborationRequest: null,
        collaborationHistory: [],
      },
    }

    try {
      const result = await graph.invoke(graphInput, {
        configurable: { thread_id: conversationId },
        recursionLimit: 15,
      })

      const lastMessage = result.messages[result.messages.length - 1]
      const content = this.extractContent(lastMessage)

      // Try to extract flow definition from tool results
      const flowDefinition = this.extractFlowFromResult(result)

      return {
        success: true,
        output: {
          result: content,
          flowDefinition: flowDefinition ?? null,
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: `AI flow generation failed: ${message}` }
    }
  }

  // ── analyze_data ────────────────────────────────────────────────

  /**
   * General analysis via direct LLM call (no tools, no graph).
   * Used for data analysis, summarization, and general reasoning.
   */
  private async analyzeData(
    prompt: string,
    model: string | undefined,
  ): Promise<NodeExecutionResult> {
    try {
      const llmOpts: Record<string, unknown> = {
        temperature: 0.3,
        maxTokens: 4096,
      }
      if (model) {
        llmOpts.model = model
      }

      const llm = await getLLM(llmOpts)

      const stream = await llm.stream([
        new SystemMessage(ANALYZE_SYSTEM_PROMPT),
        new HumanMessage(prompt),
      ])

      let content = ''
      for await (const chunk of stream) {
        const chunkContent = typeof chunk.content === 'string' ? chunk.content : ''
        if (chunkContent) content += chunkContent
      }

      if (!content) {
        return { success: false, error: 'AI returned empty response' }
      }

      return {
        success: true,
        output: {
          result: content,
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: `AI analysis failed: ${message}` }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────

  /**
   * Build the full prompt by injecting optional context variables.
   */
  private buildFullPrompt(
    prompt: string,
    contextVars: Record<string, unknown> | undefined,
    variables: Record<string, unknown>,
  ): string {
    let fullPrompt = prompt

    if (contextVars && Object.keys(contextVars).length > 0) {
      const resolvedContext = this.resolveObjectValues(contextVars, variables)
      const contextLines = Object.entries(resolvedContext)
        .map(([key, value]) => `- ${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
        .join('\n')
      fullPrompt += `\n\n--- 上下文变量 ---\n${contextLines}`
    }

    return fullPrompt
  }

  /**
   * Resolve {{variable}} placeholders in a string.
   * Supports dot-notation paths like {{nodeId.output.field}}.
   */
  private resolveTemplate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_match, ref: string) => {
      const path = ref.trim()
      const value = this.resolvePath(variables, path)
      if (value === undefined || value === null) return `{{${path}}}`
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    })
  }

  /**
   * Resolve object values — apply template resolution to string values.
   */
  private resolveObjectValues(
    obj: Record<string, unknown>,
    variables: Record<string, unknown>,
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolveTemplate(value, variables)
      } else {
        resolved[key] = value
      }
    }
    return resolved
  }

  /**
   * Resolve a dot-notation path from an object.
   * e.g. "formData.name" -> variables.formData.name
   */
  private resolvePath(obj: Record<string, unknown>, path: string): unknown {
    const segments = path.split('.')
    let value: unknown = obj
    for (const seg of segments) {
      if (value == null || typeof value !== 'object') return undefined
      value = (value as Record<string, unknown>)[seg]
    }
    return value
  }

  /**
   * Extract text content from a LangChain message.
   */
  private extractContent(message: unknown): string {
    if (!message) return ''
    const msg = message as { content?: unknown }
    if (typeof msg.content === 'string') return msg.content
    if (Array.isArray(msg.content)) {
      return msg.content
        .filter((c: unknown) => typeof c === 'object' && c !== null && (c as Record<string, unknown>).type === 'text')
        .map((c: unknown) => (c as Record<string, unknown>).text as string)
        .join('')
    }
    return ''
  }

  /**
   * Extract schema JSON from graph execution results.
   * Looks for tool messages containing schema creation results.
   */
  private extractSchemaFromResult(result: { messages: unknown[] }): Record<string, unknown> | null {
    for (let i = result.messages.length - 1; i >= 0; i--) {
      const msg = result.messages[i] as Record<string, unknown>
      const content = msg.content as string | undefined
      if (typeof content === 'string') {
        // Look for tool result containing schema JSON
        try {
          const parsed = JSON.parse(content) as Record<string, unknown>
          // Tool result format from editor/page tools
          if (parsed.success && parsed.data) {
            const data = parsed.data as Record<string, unknown>
            if (data.json) return data.json as Record<string, unknown>
          }
        } catch {
          // Not JSON, continue searching
        }
      }
    }
    return null
  }

  /**
   * Extract flow definition from graph execution results.
   * Looks for tool messages containing flow creation results.
   */
  private extractFlowFromResult(result: { messages: unknown[] }): { nodes: unknown[]; edges: unknown[] } | null {
    for (let i = result.messages.length - 1; i >= 0; i--) {
      const msg = result.messages[i] as Record<string, unknown>
      const content = msg.content as string | undefined
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content) as Record<string, unknown>
          if (parsed.success && parsed.data) {
            const data = parsed.data as Record<string, unknown>
            if (data.nodes && data.edges) {
              return { nodes: data.nodes as unknown[], edges: data.edges as unknown[] }
            }
          }
        } catch {
          // Not JSON, continue searching
        }
      }
    }
    return null
  }
}
