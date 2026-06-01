import type { FlowApiConfig } from './apiConfig.js'

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
export type ApprovalMode = 'single' | 'countersign' | 'or-sign'
export type FormMode = 'edit' | 'view'
export type RejectPolicy = 'reject-on-all' | 'reject-on-any'

export interface MultiInstanceConfig {
  type: 'none' | 'sequential' | 'parallel'
  collection?: string
  elementVariable?: string
  completionCondition?: string
}

export interface BpmnNodeConfig {
  bpmnType: BpmnElementType
  label: string
  assigneeType?: AssigneeType
  assignee?: string
  candidateUsers?: string[]
  candidateRoles?: string[]
  approvalMode?: ApprovalMode
  assigneeCollection?: string
  minApprovalCount?: number
  formSchemaId?: string
  formPublishId?: string
  formVersion?: string
  formMode?: FormMode
  formVariable?: string
  hostMethods?: string[]
  serviceType?: ServiceType
  serviceConfig?: Record<string, unknown>
  apiConfig?: FlowApiConfig
  gatewayDirection?: GatewayDirection
  defaultFlow?: string
  subProcessDefinitionId?: string
  inputMapping?: Record<string, unknown>
  outputMapping?: Record<string, unknown>
  timerType?: TimerType
  timerValue?: string
  scriptLanguage?: string
  scriptContent?: string
  messageRef?: string
  documentation?: string
  rejectPolicy?: RejectPolicy | 'follow-global'
  multiInstance?: MultiInstanceConfig
}
