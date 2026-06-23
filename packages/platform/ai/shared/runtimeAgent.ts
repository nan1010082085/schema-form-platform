/**
 * RuntimeAgent — 运行时 AI Agent
 *
 * 在流程执行过程中介入，提供智能决策能力。
 * 三项目关联：
 * - Flow: 在流程执行中调用 AI 进行智能决策
 * - Editor: 在审批界面展示 AI 建议
 * - AI: 提供智能分析和预测
 */

import type { TaskInstanceData, FlowInstanceData } from '@schema-form/flow-shared'

// ────────────────────────────────────────────
// AI 介入请求类型
// ────────────────────────────────────────────

export type RuntimeAIRequest =
  | { type: 'recommend-assignee'; task: TaskInstanceData; context: ExecutionContext }
  | { type: 'evaluate-condition'; expression: string; variables: Record<string, unknown> }
  | { type: 'predict-outcome'; task: TaskInstanceData; formData?: Record<string, unknown> }
  | { type: 'detect-anomaly'; instance: FlowInstanceData; tasks: TaskInstanceData[] }

export interface ExecutionContext {
  instanceId: string
  variables: Record<string, unknown>
  nodeFormData: Record<string, Record<string, unknown>>
  operator?: string
  initiator?: string
}

// ────────────────────────────────────────────
// AI 响应类型
// ────────────────────────────────────────────

export interface AssigneeRecommendation {
  userId: string
  userName: string
  score: number
  reason: string
}

export interface OutcomePrediction {
  passProbability: number
  estimatedDuration: number
  riskFactors: string[]
}

export interface AnomalyDetection {
  type: 'timeout' | 'stuck' | 'loop' | 'bottleneck'
  severity: 'low' | 'medium' | 'high'
  description: string
  suggestion: string
  affectedNodes: string[]
}

// ────────────────────────────────────────────
// RuntimeAgent 类
// ────────────────────────────────────────────

export class RuntimeAgent {
  private apiBase: string
  private tokenProvider?: () => string | null

  constructor(config: { apiBase: string; tokenProvider?: () => string | null }) {
    this.apiBase = config.apiBase
    this.tokenProvider = config.tokenProvider
  }

  /**
   * 智能指派人推荐
   */
  async recommendAssignee(
    task: TaskInstanceData,
    context: ExecutionContext,
  ): Promise<AssigneeRecommendation[]> {
    const response = await this.request<AssigneeRecommendation[]>('/ai/runtime/recommend-assignee', {
      method: 'POST',
      body: JSON.stringify({
        task: {
          id: task.id,
          nodeId: task.nodeId,
          nodeName: task.nodeName,
          candidateUsers: task.candidateUsers,
          candidateRoles: task.candidateRoles,
        },
        context: {
          instanceId: context.instanceId,
          variables: context.variables,
          initiator: context.initiator,
        },
      }),
    })
    return response
  }

  /**
   * 条件表达式评估（复杂业务逻辑）
   */
  async evaluateCondition(
    expression: string,
    variables: Record<string, unknown>,
  ): Promise<boolean> {
    const response = await this.request<{ result: boolean }>('/ai/runtime/evaluate-condition', {
      method: 'POST',
      body: JSON.stringify({ expression, variables }),
    })
    return response.result
  }

  /**
   * 预测审批结果
   */
  async predictOutcome(
    task: TaskInstanceData,
    formData?: Record<string, unknown>,
  ): Promise<OutcomePrediction> {
    const response = await this.request<OutcomePrediction>('/ai/runtime/predict-outcome', {
      method: 'POST',
      body: JSON.stringify({
        task: {
          id: task.id,
          nodeId: task.nodeId,
          nodeName: task.nodeName,
          assignee: task.assignee,
        },
        formData,
      }),
    })
    return response
  }

  /**
   * 异常检测
   */
  async detectAnomaly(
    instance: FlowInstanceData,
    tasks: TaskInstanceData[],
  ): Promise<AnomalyDetection | null> {
    const response = await this.request<AnomalyDetection | null>('/ai/runtime/detect-anomaly', {
      method: 'POST',
      body: JSON.stringify({
        instance: {
          id: instance.id,
          definitionId: instance.definitionId,
          status: instance.status,
          startedAt: instance.startedAt,
        },
        tasks: tasks.map(t => ({
          id: t.id,
          nodeId: t.nodeId,
          nodeName: t.nodeName,
          status: t.status,
          createdAt: t.createdAt,
        })),
      }),
    })
    return response
  }

  /**
   * 审批建议（供 Editor 嵌入式组件展示）
   */
  async getApprovalSuggestion(
    task: TaskInstanceData,
    context: ExecutionContext,
  ): Promise<{
    suggestion: string
    confidence: number
    reasoning: string
  }> {
    const response = await this.request<{
      suggestion: string
      confidence: number
      reasoning: string
    }>('/ai/runtime/approval-suggestion', {
      method: 'POST',
      body: JSON.stringify({
        task: {
          id: task.id,
          nodeId: task.nodeId,
          nodeName: task.nodeName,
          formData: task.formData,
        },
        context: {
          variables: context.variables,
          nodeFormData: context.nodeFormData,
        },
      }),
    })
    return response
  }

  // ────── 内部方法 ──────

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = this.tokenProvider?.()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.apiBase}${path}`, {
      ...options,
      headers: { ...headers, ...options?.headers },
    })

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`)
    }

    return response.json()
  }
}
