/**
 * useChatContext — ChatContext 构建与同步
 *
 * 职责：
 * - 从宿主（Editor/Flow）接收上下文数据并维护 ChatContext
 * - 提供字段级别的上下文更新方法
 * - 构建发送给 AI 服务端的完整 context（合并 chatSettings 等运行时状态）
 *
 * 符合项目 useXXX 规范：封装共享业务逻辑，不包含 UI 渲染。
 */

import { ref, computed, watch } from 'vue'
import type { ChatContext, SelectedWidgetInfo, Widget, FlowGraph } from '@/types'
import type { ChatSettings } from '@/types'

export interface UseChatContextOptions {
  /** 初始上下文 */
  initial?: Partial<ChatContext>
}

export function useChatContext(options: UseChatContextOptions = {}) {
  // ---- 内部状态 ----

  const context = ref<ChatContext>({
    source: 'standalone',
    ...options.initial,
  })

  // ---- 字段级更新 ----

  function setSource(source: ChatContext['source']): void {
    context.value.source = source
  }

  function setSchemaId(schemaId: string | undefined): void {
    context.value.schemaId = schemaId
  }

  function setFlowId(flowId: string | undefined): void {
    context.value.flowId = flowId
  }

  function setNodeId(nodeId: string | undefined): void {
    context.value.nodeId = nodeId
  }

  function setVersion(version: string | undefined): void {
    context.value.version = version
  }

  function setSelectedWidget(widget: SelectedWidgetInfo | null): void {
    context.value.selectedWidget = widget ?? undefined
  }

  function setEditorMode(mode: 'edit' | 'preview' | undefined): void {
    context.value.editorMode = mode
  }

  function setCurrentSchema(schema: Widget[] | null): void {
    context.value.currentSchema = schema ?? undefined
  }

  function setCurrentFlow(flow: FlowGraph | null): void {
    context.value.currentFlow = flow ?? undefined
  }

  function setPreferences(preferences: Record<string, unknown> | undefined): void {
    context.value.preferences = preferences
  }

  function setHistorySummary(summary: string | undefined): void {
    context.value.historySummary = summary
  }

  /**
   * 批量合并上下文字段（用于宿主一次性推送多个字段）。
   * 仅覆盖传入的字段，保留其余字段不变。
   */
  function mergeContext(partial: Partial<ChatContext>): void {
    context.value = { ...context.value, ...partial }
  }

  // ---- 构建发送上下文 ----

  /**
   * 构建发送给 AI 服务端的完整 context。
   *
   * 合并策略：
   * 1. 基础字段（source, schemaId, flowId, nodeId, version）
   * 2. selectedWidget / editorMode（编辑器实时状态）
   * 3. preferences（合并 chatSettings 的用户偏好）
   * 4. historySummary（根据 chatSettings 模式决定）
   *
   * 不包含 currentSchema / currentFlow —— 这些由 store.sendMessage 单独处理。
   */
  function buildRequestContext(chatSettings?: ChatSettings): ChatContext {
    const base = { ...context.value }

    // 合并 chatSettings 中的 preferences
    if (chatSettings) {
      base.preferences = {
        ...base.preferences,
        replyLanguage: chatSettings.preferences.replyLanguage,
        replyStyle: chatSettings.preferences.replyStyle,
        codeComment: chatSettings.preferences.codeComment,
      }

      // historySummary 模式处理
      if (chatSettings.historySummary.mode === 'manual') {
        base.historySummary = chatSettings.historySummary.manualSummary
      }
    }

    return base
  }

  // ---- 重置 ----

  function reset(): void {
    context.value = { source: 'standalone' }
  }

  return {
    // 状态
    context,

    // 字段级更新
    setSource,
    setSchemaId,
    setFlowId,
    setNodeId,
    setVersion,
    setSelectedWidget,
    setEditorMode,
    setCurrentSchema,
    setCurrentFlow,
    setPreferences,
    setHistorySummary,

    // 批量更新
    mergeContext,

    // 构建请求
    buildRequestContext,

    // 重置
    reset,
  }
}
