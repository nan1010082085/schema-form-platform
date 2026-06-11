import { markRaw, type Component } from 'vue'
import DefaultNodePanel from '@/components/nodePanels/DefaultNodePanel.vue'
import UserTaskPanel from '@/components/nodePanels/UserTaskPanel.vue'
import ServiceTaskPanel from '@/components/nodePanels/ServiceTaskPanel.vue'
import ScriptTaskPanel from '@/components/nodePanels/ScriptTaskPanel.vue'
import SendTaskPanel from '@/components/nodePanels/SendTaskPanel.vue'
import ReceiveTaskPanel from '@/components/nodePanels/ReceiveTaskPanel.vue'
import TimerEventPanel from '@/components/nodePanels/TimerEventPanel.vue'
import GatewayPanel from '@/components/nodePanels/GatewayPanel.vue'
import GatewayConditionPanel from '@/components/panels/GatewayConditionPanel.vue'
import SubProcessPanel from '@/components/nodePanels/SubProcessPanel.vue'

const registry = new Map<string, Component>([
  ['start-event', markRaw(DefaultNodePanel)],
  ['end-event', markRaw(DefaultNodePanel)],
  ['user-task', markRaw(UserTaskPanel)],
  ['service-task', markRaw(ServiceTaskPanel)],
  ['script-task', markRaw(ScriptTaskPanel)],
  ['send-task', markRaw(SendTaskPanel)],
  ['receive-task', markRaw(ReceiveTaskPanel)],
  ['timer-event', markRaw(TimerEventPanel)],
  ['exclusive-gateway', markRaw(GatewayConditionPanel)],
  ['parallel-gateway', markRaw(GatewayConditionPanel)],
  ['inclusive-gateway', markRaw(GatewayConditionPanel)],
  ['sub-process', markRaw(SubProcessPanel)],
])

/**
 * Fields in node panels that support variable reference insertion.
 * Each entry maps to the node panel(s) and field key(s) where
 * VariableSelector should appear instead of a plain el-input.
 */
const VARIABLE_AWARE_FIELDS: Array<{
  nodeType: string
  fieldKey: string
}> = [
  // UserTask
  { nodeType: 'user-task', fieldKey: 'assignee' },
  { nodeType: 'user-task', fieldKey: 'assigneeCollection' },
  { nodeType: 'user-task', fieldKey: 'formVariable' },
  // ServiceTask
  { nodeType: 'service-task', fieldKey: 'apiConfig.url' },
  { nodeType: 'service-task', fieldKey: 'apiConfig.body' },
  { nodeType: 'service-task', fieldKey: 'apiConfig.params' },
  { nodeType: 'service-task', fieldKey: 'apiConfig.dataPath' },
  // ScriptTask
  { nodeType: 'script-task', fieldKey: 'scriptContent' },
  // SendTask
  { nodeType: 'send-task', fieldKey: 'serviceConfig.bodyTemplate' },
  { nodeType: 'send-task', fieldKey: 'serviceConfig.url' },
  // ReceiveTask
  { nodeType: 'receive-task', fieldKey: 'receiveCondition' },
  // TimerEvent
  { nodeType: 'timer-event', fieldKey: 'timerValue' },
  // Gateway (edge conditions)
  { nodeType: 'exclusive-gateway', fieldKey: 'conditionExpression' },
  { nodeType: 'inclusive-gateway', fieldKey: 'conditionExpression' },
]

export function useNodePropertyPanel() {
  function getPanelComponent(nodeType: string): Component {
    return registry.get(nodeType) ?? DefaultNodePanel
  }

  function registerPanel(nodeType: string, component: Component): void {
    registry.set(nodeType, markRaw(component))
  }

  /**
   * Check if a specific field on a node type should use VariableSelector
   * instead of a plain input.
   */
  function isVariableAware(nodeType: string, fieldKey: string): boolean {
    return VARIABLE_AWARE_FIELDS.some(
      (f) => f.nodeType === nodeType && f.fieldKey === fieldKey,
    )
  }

  /**
   * Get variable-aware fields for a given node type.
   */
  function getVariableAwareKeys(nodeType: string): string[] {
    return VARIABLE_AWARE_FIELDS
      .filter((f) => f.nodeType === nodeType)
      .map((f) => f.fieldKey)
  }

  return { getPanelComponent, registerPanel, isVariableAware, getVariableAwareKeys }
}
