/**
 * Workflow Module — 工作流引擎核心模块
 *
 * 导出所有工作流相关的类型、工具和执行器。
 */

// ─── Types ─────────────────────────────────────────────────────

export type {
  VariableType,
  VariableSource,
  VariableDefinition,
  NodeType,
  WorkflowNode,
  WorkflowEdge,
  WorkflowDefinition,
  NodeStatus,
  NodeOutput,
} from './types.js'

// ─── Variable Bus ──────────────────────────────────────────────

export { VariableBus, VariableNotFoundError, VariableTypeError } from './variableBus.js'

// ─── Tool Registry ─────────────────────────────────────────────

export { ToolRegistry, toolRegistry } from './toolRegistry.js'
export type { ToolParameter, ToolDefinition, ToolResult } from './toolRegistry.js'

// ─── Tools ─────────────────────────────────────────────────────

export { registerAllTools } from './tools/index.js'
export { registerEditorTools } from './tools/editor.js'
export { registerFlowTools } from './tools/flow.js'
export { registerAITools } from './tools/ai.js'

// ─── Node Executors ────────────────────────────────────────────

export { NodeExecutor, NodeTimeoutError, NodeCancelledError } from './nodeExecutors/base.js'
export type { NodeExecutionContext, NodeExecutionResult } from './nodeExecutors/base.js'
export { EditorNodeExecutor } from './nodeExecutors/editor.js'
export { ConditionNodeExecutor } from './nodeExecutors/condition.js'

// ─── Execution Engine ──────────────────────────────────────────

export { WorkflowExecutionEngine } from './executionEngine.js'
export type { ExecutionState, EngineEvents } from './executionEngine.js'
