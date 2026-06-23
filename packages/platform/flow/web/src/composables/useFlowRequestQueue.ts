/**
 * 流程数据请求队列 composable
 *
 * 提供响应式的请求队列管理：
 * - 从流程图批量收集并执行 API 请求
 * - 单个节点 API 配置执行
 * - 加载状态、错误追踪
 */
import { ref } from 'vue'
import type { FlowApiConfig, FlowGraph } from '@schema-form/flow-shared'
import {
  collectApiTasks,
  executeQueue,
  processFlowGraph,
  clearRequestCache,
} from '../utils/flowRequestQueue.js'

export function useFlowRequestQueue() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const results = ref<Map<string, unknown>>(new Map())

  /** 批量执行流程图中所有 API 请求 */
  async function fetchAll(graph: FlowGraph) {
    loading.value = true
    error.value = null
    try {
      results.value = await processFlowGraph(graph)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '请求失败'
    } finally {
      loading.value = false
    }
  }

  /** 执行单个 API 配置 */
  async function fetchOne(config: FlowApiConfig): Promise<unknown> {
    const tasks = [{ key: 'single', config }]
    const map = await executeQueue(tasks)
    return map.get('single')
  }

  /** 收集任务（不执行，用于预览） */
  function collect(graph: FlowGraph) {
    return collectApiTasks(graph)
  }

  return {
    loading,
    error,
    results,
    fetchAll,
    fetchOne,
    collect,
    clearCache: clearRequestCache,
  }
}
