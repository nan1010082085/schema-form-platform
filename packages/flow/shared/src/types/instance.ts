export type FlowInstanceStatus = 'running' | 'completed' | 'terminated' | 'suspended' | 'failed'
export type TaskInstanceStatus = 'pending' | 'claimed' | 'completed' | 'cancelled' | 'delegated'
export type FlowTokenState = 'active' | 'waiting' | 'completed'

export interface FlowToken {
  tokenId: string
  nodeId: string
  parentTokenId?: string
  multiInstanceGroupId?: string
  state: FlowTokenState
  createdAt: Date
}

export interface FlowInstanceData {
  id: string
  definitionId: string
  versionId: string
  version: number
  status: FlowInstanceStatus
  variables: Record<string, unknown>
  tokens: FlowToken[]
  initiatedBy: string
  startedAt: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface TaskInstanceData {
  id: string
  instanceId: string
  nodeId: string
  nodeName: string
  status: TaskInstanceStatus
  assignee?: string
  candidateUsers?: string[]
  candidateRoles?: string[]
  formData?: Record<string, unknown>
  formSchemaId?: string
  formPublishId?: string
  formVersion?: string
  formMode?: 'edit' | 'view'
  hostMethods?: string[]
  outcome?: string
  dueDate?: Date
  priority: number
  multiInstanceIndex?: number
  multiInstanceItem?: string
  createdAt: Date
  updatedAt: Date
}

export type ApprovalAction = 'claim' | 'approve' | 'reject' | 'delegate' | 'comment'

export interface ApprovalLogEntry {
  id: string
  instanceId: string
  nodeId: string
  nodeName: string
  taskId: string
  action: ApprovalAction
  operator: string
  comment?: string
  outcome?: string
  createdAt: Date
}
