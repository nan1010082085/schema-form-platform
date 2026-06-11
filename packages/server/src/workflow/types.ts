/**
 * Workflow type definitions.
 *
 * Inspired by Dify's variable system design:
 * - Variables are scoped per-node and per-workflow
 * - Each node declares its outputs as VariableDefinition[]
 * - The VariableBus resolves {{nodeId.output.field}} references at runtime
 * - Variable types: string | number | boolean | array | object
 */

// ─── Variable types ───────────────────────────────────────────────

export type VariableType = 'string' | 'number' | 'boolean' | 'array' | 'object'

/**
 * Where a variable originates from.
 * - input: user-supplied at workflow start
 * - node-output: produced by a specific node's execution
 * - env: environment / system-level constant
 */
export type VariableSource = 'input' | 'node-output' | 'env'

export interface VariableDefinition {
  /** Variable name (unique within its scope) */
  name: string
  /** Data type */
  type: VariableType
  /** Origin of the value */
  source: VariableSource
  /** Human-readable description */
  description?: string
  /** Default value when unset */
  defaultValue?: unknown
}

// ─── Workflow graph ───────────────────────────────────────────────

export type NodeType =
  | 'start'
  | 'end'
  | 'http'
  | 'code'
  | 'condition'
  | 'variable-aggregator'
  | 'llm'
  | 'tool'
  | 'human'

export interface WorkflowNode {
  /** Unique node identifier (UUID) */
  id: string
  /** Node type */
  type: NodeType
  /** Display label */
  label: string
  /** Node-specific configuration (shape depends on type) */
  config: Record<string, unknown>
  /**
   * Variables this node declares as outputs.
   * After execution these values are written to the VariableBus.
   */
  outputs: VariableDefinition[]
  /** Timeout in ms (0 = no limit) */
  timeout?: number
  /** Retry count on failure */
  retryCount?: number
}

export interface WorkflowEdge {
  /** Unique edge identifier */
  id: string
  /** Source node ID */
  source: string
  /** Target node ID */
  target: string
  /**
   * Optional condition expression.
   * When present the edge is only traversed if the expression evaluates to true.
   * The expression may reference variables via {{nodeId.output.field}}.
   */
  condition?: string
  /** Label displayed on the edge (for debugging / UI) */
  label?: string
}

// ─── Workflow definition ──────────────────────────────────────────

export interface WorkflowDefinition {
  /** Unique workflow ID (UUID) */
  id: string
  /** Human-readable name */
  name: string
  /** Description */
  description?: string
  /** Nodes in the workflow graph */
  nodes: WorkflowNode[]
  /** Directed edges between nodes */
  edges: WorkflowEdge[]
  /**
   * Input variables the workflow expects from the caller.
   * These are injected into the VariableBus with source='input' before execution starts.
   */
  inputVariables: VariableDefinition[]
  /**
   * Output variables the workflow exposes to the caller after completion.
   * Each entry references a variable already present in the bus (typically a node output).
   */
  outputVariables: VariableDefinition[]
  /** Schema version (for forward-compat migrations) */
  version: string
  /** Tenant ID (multi-tenancy) */
  tenantId?: string
  /** Created by user ID */
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

// ─── Node execution result ────────────────────────────────────────

export type NodeStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'

export interface NodeOutput {
  /** Node ID that produced this output */
  nodeId: string
  /** Execution status */
  status: NodeStatus
  /** Output data (written to VariableBus as node-output variables) */
  data: Record<string, unknown>
  /** Error message when status === 'failed' */
  error?: string
  /** Execution duration in ms */
  durationMs?: number
  /** Retry attempt number (0 = first attempt) */
  retryAttempt?: number
}
