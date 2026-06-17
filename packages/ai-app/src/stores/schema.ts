/**
 * Schema 状态管理 Store
 *
 * 职责：Schema/Flow 状态、版本历史、Diff 管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Widget,
  FlowGraph,
  SchemaDiff,
  FlowDiff,
  VersionEntry,
} from '@/types'
import {
  getVersions,
  rollbackVersion,
} from '@/api/aiApi'

export const useSchemaStore = defineStore('schema', () => {
  // ---- State ----
  const currentSchema = ref<Widget[] | null>(null)
  const currentFlow = ref<FlowGraph | null>(null)

  // ---- Schema 增量编辑状态 ----
  /** Schema 历史栈，用于撤销操作 */
  const schemaHistory = ref<Widget[][]>([])
  /** 最近一次增量更新的 diff */
  const currentDiff = ref<SchemaDiff | null>(null)
  /** 最近一次增量更新的 diff (flow) */
  const currentFlowDiff = ref<FlowDiff | null>(null)
  /** 最近一次增量更新的描述 */
  const schemaUpdateDescription = ref<string | null>(null)

  // ---- 版本历史状态 ----
  const versionHistory = ref<VersionEntry[]>([])
  const currentVersionIndex = ref<number>(-1)

  // ---- 流式 Schema 生成状态 ----
  /** 当前构建步骤 */
  const currentBuildStep = ref<string | null>(null)

  // ---- Getters ----
  const hasPreview = computed(() =>
    currentSchema.value !== null || currentFlow.value !== null,
  )

  const canUndoSchema = computed(() => schemaHistory.value.length > 0)

  // ---- Actions ----
  function setCurrentSchema(schema: Widget[] | null): void {
    currentSchema.value = schema
  }

  function setCurrentFlow(flow: FlowGraph | null): void {
    currentFlow.value = flow
  }

  /**
   * 推送 Schema 到历史栈（在覆盖前调用）
   */
  function pushSchemaHistory(): void {
    if (currentSchema.value) {
      schemaHistory.value.push(JSON.parse(JSON.stringify(currentSchema.value)))
    }
  }

  /**
   * 撤销最近一次 Schema 增量更新。
   */
  function undoLastSchemaUpdate(): void {
    if (schemaHistory.value.length === 0) return
    const previousSchema = schemaHistory.value.pop()
    if (previousSchema) {
      currentSchema.value = previousSchema
      currentDiff.value = null
      schemaUpdateDescription.value = null
    }
  }

  /**
   * 清除当前 diff 显示状态。
   */
  function clearDiff(): void {
    currentDiff.value = null
    currentFlowDiff.value = null
    schemaUpdateDescription.value = null
  }

  /**
   * 设置 Schema diff
   */
  function setSchemaDiff(diff: SchemaDiff, description?: string): void {
    currentDiff.value = diff
    schemaUpdateDescription.value = description ?? null
  }

  /**
   * 设置 Flow diff
   */
  function setFlowDiff(diff: FlowDiff): void {
    currentFlowDiff.value = diff
  }

  /**
   * 设置构建步骤
   */
  function setBuildStep(step: string | null): void {
    currentBuildStep.value = step
  }

  /**
   * 更新 Schema（带历史记录）
   */
  function updateSchema(schema: Widget[]): void {
    pushSchemaHistory()
    currentSchema.value = schema
  }

  /**
   * 更新 Flow
   */
  function updateFlow(flow: FlowGraph): void {
    currentFlow.value = flow
  }

  // ---- 版本管理 ----

  /**
   * 加载当前对话的版本历史列表。
   */
  async function loadVersionHistory(conversationId: string): Promise<void> {
    const data = await getVersions(conversationId)
    versionHistory.value = data.map((v: { id: string; version: number; type: string; description?: string; createdAt: string }) => ({
      id: v.id,
      version: v.version,
      type: v.type as 'schema' | 'flow',
      description: v.description,
      createdAt: v.createdAt,
    }))
    if (versionHistory.value.length > 0) {
      currentVersionIndex.value = 0
    }
  }

  /**
   * 回滚到指定版本。
   */
  async function rollbackToVersion(conversationId: string, versionId: string): Promise<void> {
    const result = await rollbackVersion(conversationId, versionId)
    if (result.type === 'schema' && result.content) {
      pushSchemaHistory()
      currentSchema.value = result.content as unknown as Widget[]
      currentDiff.value = null
    } else if (result.type === 'flow' && result.content) {
      currentFlow.value = result.content as unknown as FlowGraph
      currentFlowDiff.value = null
    }
    // Reload version history
    await loadVersionHistory(conversationId)
  }

  function clearSchemaState(): void {
    currentSchema.value = null
    currentFlow.value = null
    schemaHistory.value = []
    currentDiff.value = null
    currentFlowDiff.value = null
    schemaUpdateDescription.value = null
    versionHistory.value = []
    currentVersionIndex.value = -1
    currentBuildStep.value = null
  }

  return {
    // state
    currentSchema,
    currentFlow,
    schemaHistory,
    currentDiff,
    currentFlowDiff,
    schemaUpdateDescription,
    versionHistory,
    currentVersionIndex,
    currentBuildStep,
    // getters
    hasPreview,
    canUndoSchema,
    // actions
    setCurrentSchema,
    setCurrentFlow,
    pushSchemaHistory,
    undoLastSchemaUpdate,
    clearDiff,
    setSchemaDiff,
    setFlowDiff,
    setBuildStep,
    updateSchema,
    updateFlow,
    loadVersionHistory,
    rollbackToVersion,
    clearSchemaState,
  }
})
