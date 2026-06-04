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
  ['parallel-gateway', markRaw(GatewayPanel)],
  ['inclusive-gateway', markRaw(GatewayConditionPanel)],
  ['sub-process', markRaw(SubProcessPanel)],
])

export function useNodePropertyPanel() {
  function getPanelComponent(nodeType: string): Component {
    return registry.get(nodeType) ?? DefaultNodePanel
  }

  function registerPanel(nodeType: string, component: Component): void {
    registry.set(nodeType, markRaw(component))
  }

  return { getPanelComponent, registerPanel }
}
