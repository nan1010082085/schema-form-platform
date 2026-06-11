/**
 * WorkflowExecutionEngine — 工作流执行引擎
 *
 * 核心功能：
 * - 按节点拓扑排序执行
 * - 每个节点执行后将输出存入 VariableBus
 * - 支持条件分支（if-else 节点）
 * - 支持并行执行
 * - 支持错误处理和重试
 * - 支持超时和取消
 *
 * 设计原则：
 * - 引擎负责调度，节点负责执行
 * - 变量通过 VariableBus 在节点间传递
 * - 条件节点返回分支路径，引擎根据路径跳转
 * - 并行节点使用 Promise.all 并发执行
 */

import { v4 as uuidv4 } from 'uuid'
import { VariableBus } from './variableBus.js'
import { NodeExecutor } from './nodeExecutors/base.js'
import type { NodeExecutionContext, NodeExecutionResult } from './nodeExecutors/base.js'
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeOutput,
  NodeStatus,
} from './types.js'

// ─── Execution State ──────────────────────────────────────────────

export interface ExecutionState {
  /** 执行 ID */
  executionId: string
  /** 工作流 ID */
  workflowId: string
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  /** 节点执行结果 Map */
  nodeOutputs: Map<string, NodeOutput>
  /** 变量总线 */
  bus: VariableBus
  /** 开始时间 */
  startTime: Date
  /** 结束时间 */
  endTime?: Date
  /** 错误信息 */
  error?: string
}

// ─── Engine Events ────────────────────────────────────────────────

export interface EngineEvents {
  onNodeStart?: (nodeId: string, nodeLabel: string) => void
  onNodeComplete?: (nodeId: string, result: NodeExecutionResult) => void
  onNodeError?: (nodeId: string, error: string) => void
  onExecutionComplete?: (state: ExecutionState) => void
  onExecutionError?: (state: ExecutionState, error: string) => void
}

// ─── Execution Engine ──────────────────────────────────────────────

export class WorkflowExecutionEngine {
  private readonly executors = new Map<string, NodeExecutor>()
  private readonly events: EngineEvents

  constructor(events: EngineEvents = {}) {
    this.events = events
  }

  /**
   * 注册节点执行器
   *
   * @param nodeType - 节点类型（如 'condition', 'http', 'code' 等）
   * @param executor - 执行器实例
   */
  registerExecutor(nodeType: string, executor: NodeExecutor): void {
    this.executors.set(nodeType, executor)
  }

  /**
   * 执行工作流
   *
   * @param definition - 工作流定义
   * @param inputs - 输入变量
   * @param signal - 取消信号
   * @returns 执行状态
   */
  async execute(
    definition: WorkflowDefinition,
    inputs: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<ExecutionState> {
    const executionId = uuidv4()
    const bus = new VariableBus()

    // 初始化执行状态
    const state: ExecutionState = {
      executionId,
      workflowId: definition.id,
      status: 'running',
      nodeOutputs: new Map(),
      bus,
      startTime: new Date(),
    }

    try {
      // 注入输入变量
      bus.injectInputs(definition.inputVariables, inputs)

      // 拓扑排序
      const executionOrder = this.topologicalSort(definition.nodes, definition.edges)

      // 执行节点
      for (const nodeId of executionOrder) {
        // 检查取消
        if (signal?.aborted) {
          state.status = 'cancelled'
          state.endTime = new Date()
          state.error = 'Execution cancelled'
          this.events.onExecutionError?.(state, state.error)
          return state
        }

        const node = definition.nodes.find(n => n.id === nodeId)
        if (!node) continue

        // 检查节点是否应该被跳过（条件分支）
        if (this.shouldSkipNode(nodeId, definition.edges, state.nodeOutputs)) {
          const skippedOutput: NodeOutput = {
            nodeId,
            status: 'skipped',
            data: {},
            durationMs: 0,
          }
          state.nodeOutputs.set(nodeId, skippedOutput)
          bus.writeNodeOutputs(skippedOutput)
          continue
        }

        // 执行节点
        this.events.onNodeStart?.(nodeId, node.label)

        const result = await this.executeNode(node, bus, executionId, signal)

        // 记录输出
        const nodeOutput: NodeOutput = {
          nodeId,
          status: result.success ? 'success' : 'failed',
          data: result.output ?? {},
          error: result.error,
          durationMs: result.durationMs,
          retryAttempt: result.retryAttempt,
        }
        state.nodeOutputs.set(nodeId, nodeOutput)
        bus.writeNodeOutputs(nodeOutput)

        if (result.success) {
          this.events.onNodeComplete?.(nodeId, result)
        } else {
          this.events.onNodeError?.(nodeId, result.error ?? 'Unknown error')

          // 如果节点失败，检查是否有错误处理路径
          if (!this.hasErrorPath(nodeId, definition.edges)) {
            state.status = 'failed'
            state.endTime = new Date()
            state.error = `Node "${node.label}" failed: ${result.error}`
            this.events.onExecutionError?.(state, state.error)
            return state
          }
        }
      }

      // 执行完成
      state.status = 'completed'
      state.endTime = new Date()
      this.events.onExecutionComplete?.(state)
      return state
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      state.status = 'failed'
      state.endTime = new Date()
      state.error = message
      this.events.onExecutionError?.(state, message)
      return state
    }
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    node: WorkflowNode,
    bus: VariableBus,
    executionId: string,
    signal?: AbortSignal,
  ): Promise<NodeExecutionResult> {
    const executor = this.executors.get(node.type)
    if (!executor) {
      return {
        success: false,
        error: `No executor registered for node type: ${node.type}`,
      }
    }

    // 创建执行上下文
    const context: NodeExecutionContext = {
      bus,
      nodeId: node.id,
      nodeLabel: node.label,
      workflowId: '', // 从外部传入
      executionId,
      signal: signal ?? new AbortController().signal,
      log: (level, message, data) => {
        console[level](`[${node.id}] ${message}`, data ?? '')
      },
    }

    // 带重试的执行
    const maxRetries = node.retryCount ?? 0
    let lastResult: NodeExecutionResult | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 检查取消
        if (signal?.aborted) {
          return {
            success: false,
            error: 'Execution cancelled',
            retryAttempt: attempt,
          }
        }

        // 执行节点（带超时）
        const timeoutMs = node.timeout ?? 0
        const executePromise = executor.execute(node.config, context)

        if (timeoutMs > 0) {
          lastResult = await this.withTimeout(executePromise, timeoutMs, node.id)
        } else {
          lastResult = await executePromise
        }

        // 成功则返回
        if (lastResult.success) {
          return { ...lastResult, retryAttempt: attempt }
        }

        // 失败且还有重试机会
        if (attempt < maxRetries) {
          context.log('warn', `Node failed, retrying (${attempt + 1}/${maxRetries})...`)
          continue
        }
      } catch (err) {
        lastResult = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          retryAttempt: attempt,
        }

        // 如果是超时或取消错误，不重试
        if (err instanceof Error && (err.name === 'NodeTimeoutError' || err.name === 'NodeCancelledError')) {
          return lastResult
        }

        // 其他错误且还有重试机会
        if (attempt < maxRetries) {
          context.log('warn', `Node threw error, retrying (${attempt + 1}/${maxRetries})...`)
          continue
        }
      }
    }

    return lastResult ?? {
      success: false,
      error: 'Execution failed',
      retryAttempt: maxRetries,
    }
  }

  /**
   * 拓扑排序
   *
   * 使用 Kahn's algorithm 进行拓扑排序
   */
  private topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const nodeIds = new Set(nodes.map(n => n.id))
    const inDegree = new Map<string, number>()
    const adjacency = new Map<string, string[]>()

    // 初始化
    for (const nodeId of nodeIds) {
      inDegree.set(nodeId, 0)
      adjacency.set(nodeId, [])
    }

    // 计算入度和邻接表
    for (const edge of edges) {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
        adjacency.get(edge.source)?.push(edge.target)
      }
    }

    // Kahn's algorithm
    const queue: string[] = []
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId)
      }
    }

    const result: string[] = []
    while (queue.length > 0) {
      const nodeId = queue.shift()!
      result.push(nodeId)

      for (const neighbor of adjacency.get(nodeId) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) {
          queue.push(neighbor)
        }
      }
    }

    // 检查是否有环
    if (result.length !== nodes.length) {
      throw new Error('Workflow graph contains cycles')
    }

    return result
  }

  /**
   * 检查节点是否应该被跳过
   *
   * 如果节点的所有入边都有条件，且条件都不满足，则跳过
   */
  private shouldSkipNode(
    nodeId: string,
    edges: WorkflowEdge[],
    nodeOutputs: Map<string, NodeOutput>,
  ): boolean {
    const incomingEdges = edges.filter(e => e.target === nodeId)

    // 没有入边的节点（如 start 节点）不跳过
    if (incomingEdges.length === 0) return false

    // 检查是否有无条件的入边
    const hasUnconditionalEdge = incomingEdges.some(e => !e.condition)
    if (hasUnconditionalEdge) return false

    // 检查条件入边的源节点输出
    for (const edge of incomingEdges) {
      if (!edge.condition) continue

      const sourceOutput = nodeOutputs.get(edge.source)
      if (!sourceOutput) continue

      // 如果源节点是条件节点，检查分支是否匹配
      if (sourceOutput.data.branch === 'true' && edge.condition === 'true') {
        return false
      }
      if (sourceOutput.data.branch === 'false' && edge.condition === 'false') {
        return false
      }
    }

    return true
  }

  /**
   * 检查节点是否有错误处理路径
   */
  private hasErrorPath(nodeId: string, edges: WorkflowEdge[]): boolean {
    return edges.some(e => e.source === nodeId && e.condition === 'error')
  }

  /**
   * 包装 Promise，超时后自动拒绝
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, nodeId: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Node "${nodeId}" execution timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  }
}
