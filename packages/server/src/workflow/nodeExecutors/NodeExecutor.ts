import type { IFlowInstance } from '../../flow-models/FlowInstance.js'

/**
 * Execution context passed to every node executor.
 * Provides access to the flow instance, its variables, and metadata.
 */
export interface NodeExecutionContext {
  /** The flow instance being executed */
  instance: IFlowInstance
  /** Mutable variables bag — executors read from and write to this */
  variables: Record<string, unknown>
  /** Current node ID in the flow graph */
  nodeId: string
  /** Current node label (human-readable name) */
  nodeName: string
}

/**
 * Execution result returned by a node executor.
 */
export interface NodeExecutionResult {
  /** Whether the execution succeeded */
  success: boolean
  /** Output data to merge into instance variables */
  output?: Record<string, unknown>
  /** Error message if execution failed */
  error?: string
}

/**
 * Abstract base class for node executors.
 *
 * Each executor is responsible for executing a specific type of node
 * in the workflow engine (e.g., ServiceTask, EditorTask, etc.).
 *
 * Subclasses must implement `execute()`.
 */
export abstract class NodeExecutor {
  /**
   * Execute the node with the given inputs and context.
   *
   * @param inputs — Node configuration (from BpmnNodeConfig.serviceConfig or equivalent)
   * @param context — Runtime execution context with instance and variables
   * @returns Execution result with output data or error
   */
  abstract execute(
    inputs: Record<string, unknown>,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult>
}
