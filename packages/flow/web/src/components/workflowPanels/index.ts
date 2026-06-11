export { default as EditorNodePanel } from './EditorNodePanel.vue'
export { default as FlowNodePanel } from './FlowNodePanel.vue'
export { default as AINodePanel } from './AINodePanel.vue'
export { default as ConditionNodePanel } from './ConditionNodePanel.vue'

import { markRaw, type Component } from 'vue'
import EditorNodePanel from './EditorNodePanel.vue'
import FlowNodePanel from './FlowNodePanel.vue'
import AINodePanel from './AINodePanel.vue'
import ConditionNodePanel from './ConditionNodePanel.vue'

/** Workflow 节点类型 -> 面板组件映射 */
export const WORKFLOW_PANEL_REGISTRY: Record<string, Component> = {
  'editor-node': markRaw(EditorNodePanel),
  'flow-node': markRaw(FlowNodePanel),
  'ai-node': markRaw(AINodePanel),
  'condition-node': markRaw(ConditionNodePanel),
}

/** 所有 Workflow 节点类型 */
export const WORKFLOW_NODE_TYPES = Object.keys(WORKFLOW_PANEL_REGISTRY)
