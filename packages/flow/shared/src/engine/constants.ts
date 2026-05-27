import { BpmnElementType } from '../types/bpmn.js'
import type { BpmnNodeConfig } from '../types/bpmn.js'

export const DEFAULT_NODE_SIZES: Record<BpmnElementType, { width: number; height: number }> = {
  [BpmnElementType.StartEvent]: { width: 36, height: 36 },
  [BpmnElementType.EndEvent]: { width: 36, height: 36 },
  [BpmnElementType.TimerEvent]: { width: 36, height: 36 },
  [BpmnElementType.UserTask]: { width: 160, height: 80 },
  [BpmnElementType.ServiceTask]: { width: 160, height: 80 },
  [BpmnElementType.ScriptTask]: { width: 160, height: 80 },
  [BpmnElementType.SendTask]: { width: 160, height: 80 },
  [BpmnElementType.ReceiveTask]: { width: 160, height: 80 },
  [BpmnElementType.ExclusiveGateway]: { width: 40, height: 40 },
  [BpmnElementType.ParallelGateway]: { width: 40, height: 40 },
  [BpmnElementType.InclusiveGateway]: { width: 40, height: 40 },
  [BpmnElementType.SubProcess]: { width: 300, height: 200 },
}

export const DEFAULT_NODE_CONFIGS: Record<BpmnElementType, Partial<BpmnNodeConfig>> = {
  [BpmnElementType.StartEvent]: { label: '开始' },
  [BpmnElementType.EndEvent]: { label: '结束' },
  [BpmnElementType.TimerEvent]: { label: '定时事件', timerType: 'duration' },
  [BpmnElementType.UserTask]: { label: '用户任务', assigneeType: 'user' } as Partial<BpmnNodeConfig>,
  [BpmnElementType.ServiceTask]: { label: '服务任务', serviceType: 'http' },
  [BpmnElementType.ScriptTask]: { label: '脚本任务', serviceType: 'script' },
  [BpmnElementType.SendTask]: { label: '发送任务', serviceType: 'http' },
  [BpmnElementType.ReceiveTask]: { label: '接收任务', assigneeType: 'user' } as Partial<BpmnNodeConfig>,
  [BpmnElementType.ExclusiveGateway]: { label: '排他网关', gatewayDirection: 'diverging' },
  [BpmnElementType.ParallelGateway]: { label: '并行网关', gatewayDirection: 'diverging' },
  [BpmnElementType.InclusiveGateway]: { label: '包含网关', gatewayDirection: 'diverging' },
  [BpmnElementType.SubProcess]: { label: '子流程' },
}
