export enum BpmnElementType {
  StartEvent = 'startEvent',
  EndEvent = 'endEvent',
  TimerEvent = 'timerEvent',
  UserTask = 'userTask',
  ServiceTask = 'serviceTask',
  ScriptTask = 'scriptTask',
  SendTask = 'sendTask',
  ReceiveTask = 'receiveTask',
  ExclusiveGateway = 'exclusiveGateway',
  ParallelGateway = 'parallelGateway',
  InclusiveGateway = 'inclusiveGateway',
  SubProcess = 'subProcess',
}

export type AssigneeType = 'user' | 'role' | 'expression'
export type ServiceType = 'http' | 'function' | 'script'
export type GatewayDirection = 'converging' | 'diverging'
export type TimerType = 'duration' | 'date' | 'cycle'

export interface MultiInstanceConfig {
  type: 'sequential' | 'parallel'
  collection: string
}

export interface BpmnNodeConfig {
  bpmnType: BpmnElementType
  label: string
  assigneeType?: AssigneeType
  assignee?: string
  formSchemaId?: string
  formVersion?: string
  serviceType?: ServiceType
  serviceConfig?: Record<string, unknown>
  gatewayDirection?: GatewayDirection
  defaultFlow?: string
  subProcessDefinitionId?: string
  timerType?: TimerType
  timerValue?: string
  scriptLanguage?: string
  scriptContent?: string
  messageRef?: string
  documentation?: string
  multiInstance?: MultiInstanceConfig
}
