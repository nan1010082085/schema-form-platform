import type { FlowGraph, FlowGraphMetadata, FlowPermissions } from './graph.js'
import type { FlowInstanceStatus } from './instance.js'

export interface CreateFlowDefinitionDto {
  name: string
  description?: string
  category?: string
  permissions?: FlowPermissions
}

export interface UpdateFlowDefinitionDto {
  name?: string
  description?: string
  category?: string
  permissions?: FlowPermissions
}

export interface SaveFlowVersionDto {
  graph: FlowGraph
  metadata?: FlowGraphMetadata
}

export interface StartFlowInstanceDto {
  definitionId: string
  variables?: Record<string, unknown>
}

export interface CompleteTaskDto {
  formData?: Record<string, unknown>
  outcome?: string
}

export interface DelegateTaskDto {
  targetUserId: string
}

export interface FlowListQuery {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface FlowInstanceQuery {
  definitionId?: string
  status?: FlowInstanceStatus
  page?: number
  pageSize?: number
}
