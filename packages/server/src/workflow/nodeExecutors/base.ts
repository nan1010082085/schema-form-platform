/**
 * NodeExecutor — 增强版基类，支持超时和取消
 *
 * 设计原则：
 * - 每个节点执行器必须继承此基类
 * - execute() 是抽象方法，子类必须实现
 * - 支持 AbortSignal 用于取消长时间运行的任务
 * - 支持超时控制，超时后自动抛出 AbortError
 */

import type { VariableBus } from '../variableBus.js'

// ─── Execution Context ──────────────────────────────────────────

/**
 * 执行上下文，传递给每个节点执行器
 */
export interface NodeExecutionContext {
  /** 变量总线，用于读写节点间传递的数据 */
  bus: VariableBus
  /** 当前节点 ID */
  nodeId: string
  /** 当前节点标签（人类可读） */
  nodeLabel: string
  /** 工作流 ID */
  workflowId: string
  /** 执行 ID（单次执行的唯一标识） */
  executionId: string
  /** 取消信号，可用于取消长时间运行的任务 */
  signal: AbortSignal
  /** 日志记录函数 */
  log: (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => void
}

// ─── Execution Result ────────────────────────────────────────────

/**
 * 节点执行结果
 */
export interface NodeExecutionResult {
  /** 是否执行成功 */
  success: boolean
  /** 输出数据，将写入 VariableBus */
  output?: Record<string, unknown>
  /** 错误信息（success === false 时） */
  error?: string
  /** 执行耗时（毫秒） */
  durationMs?: number
  /** 重试次数（0 = 首次执行） */
  retryAttempt?: number
}

// ─── Timeout Error ────────────────────────────────────────────────

export class NodeTimeoutError extends Error {
  constructor(
    public readonly nodeId: string,
    public readonly timeoutMs: number,
  ) {
    super(`Node "${nodeId}" execution timed out after ${timeoutMs}ms`)
    this.name = 'NodeTimeoutError'
  }
}

export class NodeCancelledError extends Error {
  constructor(public readonly nodeId: string) {
    super(`Node "${nodeId}" execution was cancelled`)
    this.name = 'NodeCancelledError'
  }
}

// ─── Base Executor ────────────────────────────────────────────────

/**
 * 节点执行器基类
 *
 * 子类必须实现 execute() 方法。
 * 基类提供：
 * - 超时包装（withTimeout）
 * - 取消检查（checkCancellation）
 * - 重试逻辑（executeWithRetry）
 */
export abstract class NodeExecutor {
  /**
   * 执行节点
   *
   * @param inputs - 节点配置（来自 WorkflowNode.config）
   * @param context - 运行时执行上下文
   * @returns 执行结果
   */
  abstract execute(
    inputs: Record<string, unknown>,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult>

  /**
   * 包装 Promise，超时后自动拒绝
   *
   * @param promise - 要执行的 Promise
   * @param timeoutMs - 超时时间（毫秒），0 表示不超时
   * @param nodeId - 节点 ID（用于错误信息）
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    nodeId: string,
  ): Promise<T> {
    if (timeoutMs <= 0) return promise

    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new NodeTimeoutError(nodeId, timeoutMs))
        }, timeoutMs)
      }),
    ])
  }

  /**
   * 检查是否已取消，如果已取消则抛出错误
   */
  protected checkCancellation(signal: AbortSignal, nodeId: string): void {
    if (signal.aborted) {
      throw new NodeCancelledError(nodeId)
    }
  }

  /**
   * 带重试的执行逻辑
   *
   * @param fn - 要执行的函数
   * @param maxRetries - 最大重试次数
   * @param nodeId - 节点 ID
   */
  protected async executeWithRetry(
    fn: () => Promise<NodeExecutionResult>,
    maxRetries: number,
    nodeId: string,
  ): Promise<NodeExecutionResult> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn()
        if (result.success || attempt === maxRetries) {
          return { ...result, retryAttempt: attempt }
        }
        lastError = new Error(result.error ?? 'Unknown error')
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt === maxRetries) break
      }
    }

    return {
      success: false,
      error: lastError?.message ?? 'Execution failed after retries',
      retryAttempt: maxRetries,
    }
  }
}
