import { v4 as uuidv4 } from 'uuid'
import { FlowDefinitionModel } from '../../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../../flow-models/FlowVersion.js'
import { flowEngine } from '../../flow-services/FlowEngine.js'
import { NodeExecutor } from './NodeExecutor.js'
import type { NodeExecutionContext, NodeExecutionResult } from './NodeExecutor.js'

// ─── Operation types ─────────────────────────────────────────────

type FlowOperation = 'create_definition' | 'start_instance' | 'get_status'

// ─── Input config shape ─────────────────────────────────────────

interface FlowNodeInputs {
  /** Operation to perform */
  operation: FlowOperation
  /** Flow definition name (used in create_definition) */
  definitionName?: string
  /** Flow description */
  description?: string
  /** Flow nodes (from AI generation or manual config) */
  nodes?: Array<Record<string, unknown>>
  /** Flow edges */
  edges?: Array<Record<string, unknown>>
  /** Definition ID (for start_instance / get_status) */
  definitionId?: string
  /** Instance ID (for get_status) */
  instanceId?: string
  /** Variables to pass when starting an instance */
  variables?: Record<string, unknown>
}

// ─── FlowNodeExecutor ───────────────────────────────────────────

/**
 * Flow Node Executor — handles flow definition and instance operations
 * within workflow execution.
 *
 * Supports three operations:
 * - create_definition: Creates a new FlowDefinition with a version containing the graph
 * - start_instance: Starts a FlowInstance from an existing definition
 * - get_status: Retrieves the status of a running FlowInstance
 *
 * Output variables written to instance:
 *   - definitionId:   The flow definition's UUID
 *   - definitionName: The flow definition's display name
 *   - instanceId:     The flow instance's UUID (start_instance only)
 */
export class FlowNodeExecutor extends NodeExecutor {
  async execute(
    inputs: Record<string, unknown>,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = inputs as unknown as FlowNodeInputs
    const operation: FlowOperation = config.operation ?? 'create_definition'

    switch (operation) {
      case 'create_definition':
        return this.createDefinition(config, context)
      case 'start_instance':
        return this.startInstance(config, context)
      case 'get_status':
        return this.getStatus(config, context)
      default:
        return { success: false, error: `Unknown flow operation: ${operation}` }
    }
  }

  /**
   * Create a new FlowDefinition with an initial version containing the provided graph.
   */
  private async createDefinition(
    config: FlowNodeInputs,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const definitionName = this.resolveString(config.definitionName, context.variables) ?? 'Untitled Flow'
    const description = this.resolveString(config.description, context.variables) ?? ''

    if (!config.nodes || !Array.isArray(config.nodes) || config.nodes.length === 0) {
      return { success: false, error: 'Field "nodes" is required and must be a non-empty array' }
    }

    if (!config.edges || !Array.isArray(config.edges)) {
      return { success: false, error: 'Field "edges" is required and must be an array' }
    }

    const definitionId = uuidv4()
    const versionId = uuidv4()

    // Create the flow definition
    await FlowDefinitionModel.create({
      _id: definitionId,
      name: definitionName,
      description,
      status: 'draft',
      currentVersionId: versionId,
      createdBy: context.instance.initiatedBy ?? 'system',
      permissions: {
        editors: [],
        launchers: [],
        viewers: [],
      },
    })

    // Create the initial version with the graph
    await FlowVersionModel.create({
      _id: versionId,
      definitionId,
      version: '1.0.0',
      graph: {
        nodes: config.nodes,
        edges: config.edges,
      },
    })

    return {
      success: true,
      output: {
        definitionId,
        definitionName,
      },
    }
  }

  /**
   * Start a FlowInstance from an existing FlowDefinition.
   */
  private async startInstance(
    config: FlowNodeInputs,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const definitionId = this.resolveString(config.definitionId, context.variables)
    if (!definitionId) {
      return { success: false, error: 'Field "definitionId" is required for start_instance' }
    }

    const definition = await FlowDefinitionModel.findById(definitionId)
    if (!definition) {
      return { success: false, error: `Flow definition not found: ${definitionId}` }
    }

    // Resolve variables — support {{variable}} placeholders in string values
    const variables: Record<string, unknown> = {}
    if (config.variables) {
      for (const [key, value] of Object.entries(config.variables)) {
        if (typeof value === 'string') {
          variables[key] = this.resolveString(value, context.variables) ?? value
        } else {
          variables[key] = value
        }
      }
    }

    const instance = await flowEngine.startFlow(
      definitionId,
      variables,
      context.instance.initiatedBy ?? 'system',
    )

    if (!instance) {
      return { success: false, error: 'Failed to start flow instance' }
    }

    return {
      success: true,
      output: {
        definitionId,
        definitionName: definition.name,
        instanceId: instance._id,
      },
    }
  }

  /**
   * Get the status of a FlowInstance.
   */
  private async getStatus(
    config: FlowNodeInputs,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const instanceId = this.resolveString(config.instanceId, context.variables)
    if (!instanceId) {
      return { success: false, error: 'Field "instanceId" is required for get_status' }
    }

    const { FlowInstanceModel } = await import('../../flow-models/FlowInstance.js')
    const instance = await FlowInstanceModel.findById(instanceId)
    if (!instance) {
      return { success: false, error: `Flow instance not found: ${instanceId}` }
    }

    const definition = await FlowDefinitionModel.findById(instance.definitionId)

    return {
      success: true,
      output: {
        definitionId: instance.definitionId,
        definitionName: definition?.name ?? null,
        instanceId: instance._id,
        status: instance.status,
        variables: instance.variables,
        startedAt: instance.startedAt,
        completedAt: instance.completedAt ?? null,
      },
    }
  }

  /**
   * Resolve a string value that may contain {{variable}} placeholders.
   */
  private resolveString(
    template: string | undefined,
    variables: Record<string, unknown>,
  ): string | undefined {
    if (!template) return undefined

    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path: string) => {
      const value = this.resolvePath(variables, path)
      return value != null ? String(value) : `{{${path}}}`
    })
  }

  /**
   * Resolve a dot-notation path from an object.
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
}
