export type FlowInstanceStatus = 'running' | 'completed' | 'terminated' | 'suspended' | 'failed'
export type TaskInstanceStatus = 'pending' | 'claimed' | 'completed' | 'cancelled' | 'delegated'
export type FlowTokenState = 'active' | 'waiting' | 'completed'

export interface FlowToken {
  tokenId: string
  nodeId: string
  parentTokenId?: string
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
  formVersion?: string
  outcome?: string
  dueDate?: Date
  priority: number
  createdAt: Date
  updatedAt: Date
}
