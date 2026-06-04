import type {
  CreateFlowDefinitionDto,
  UpdateFlowDefinitionDto,
  SaveFlowVersionDto,
  StartFlowInstanceDto,
  CompleteTaskDto,
  DelegateTaskDto,
  RejectToNodeDto,
  RejectTargetNode,
  FlowListQuery,
  FlowInstanceQuery,
  FlowDefinitionData,
  FlowVersionData,
  FlowInstanceData,
  TaskInstanceData,

  FlowDefinitionListData,
  FlowVersionListData,
  FlowInstanceListData,
  TaskInstanceListData,
  ApprovalLogListData,
  FlowTemplateData,
  FlowTemplateQuery,
  ApplyFlowTemplateDto,
  FlowMonitorStats,
  FlowMonitorAvgDuration,
  FlowMonitorNodeStat,
  FlowMonitorTrendPoint,
} from '@schema-form/flow-shared'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message ?? 'Request failed')
  return json.data
}

export const flowApi = {
  // Flow definitions
  listFlows: (query?: FlowListQuery) => {
    const params = new URLSearchParams()
    if (query?.search) params.set('search', query.search)
    if (query?.status) params.set('status', query.status)
    if (query?.page) params.set('page', String(query.page))
    if (query?.pageSize) params.set('pageSize', String(query.pageSize))
    return request<FlowDefinitionListData>(`/flows?${params}`)
  },

  getFlow: (id: string) => request<FlowDefinitionData>(`/flows/${id}`),

  createFlow: (data: CreateFlowDefinitionDto) =>
    request<FlowDefinitionData>('/flows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFlow: (id: string, data: UpdateFlowDefinitionDto) =>
    request<FlowDefinitionData>(`/flows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteFlow: (id: string) =>
    request<null>(`/flows/${id}`, { method: 'DELETE' }),

  publishFlow: (id: string) =>
    request<FlowDefinitionData>(`/flows/${id}/publish`, { method: 'POST' }),

  // Versions
  listVersions: (definitionId: string, page?: number, pageSize?: number) => {
    const params = new URLSearchParams()
    if (page) params.set('page', String(page))
    if (pageSize) params.set('pageSize', String(pageSize))
    return request<FlowVersionListData>(`/flows/${definitionId}/versions?${params}`)
  },

  getVersion: (definitionId: string, versionId: string) =>
    request<FlowVersionData>(`/flows/${definitionId}/versions/${versionId}`),

  getLatestVersion: (definitionId: string) =>
    request<FlowVersionData>(`/flows/${definitionId}/versions/latest`),

  saveVersion: (definitionId: string, data: SaveFlowVersionDto) =>
    request<FlowVersionData>(`/flows/${definitionId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Instances
  listInstances: (query?: FlowInstanceQuery) => {
    const params = new URLSearchParams()
    if (query?.definitionId) params.set('definitionId', query.definitionId)
    if (query?.status) params.set('status', query.status)
    if (query?.page) params.set('page', String(query.page))
    if (query?.pageSize) params.set('pageSize', String(query.pageSize))
    return request<FlowInstanceListData>(`/flow-instances?${params}`)
  },

  getInstance: (id: string) => request<FlowInstanceData>(`/flow-instances/${id}`),

  startInstance: (data: StartFlowInstanceDto) =>
    request<FlowInstanceData>('/flow-instances', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  terminateInstance: (id: string) =>
    request<FlowInstanceData>(`/flow-instances/${id}/terminate`, { method: 'POST' }),

  suspendInstance: (id: string) =>
    request<FlowInstanceData>(`/flow-instances/${id}/suspend`, { method: 'POST' }),

  resumeInstance: (id: string) =>
    request<FlowInstanceData>(`/flow-instances/${id}/resume`, { method: 'POST' }),

  // Tasks
  getMyTasks: (page?: number, pageSize?: number) => {
    const params = new URLSearchParams()
    if (page) params.set('page', String(page))
    if (pageSize) params.set('pageSize', String(pageSize))
    return request<TaskInstanceListData>(`/flow-tasks/my?${params}`)
  },

  getTask: (id: string) => request<TaskInstanceData>(`/flow-tasks/${id}`),

  claimTask: (id: string) =>
    request<TaskInstanceData>(`/flow-tasks/${id}/claim`, { method: 'POST' }),

  completeTask: (id: string, data: CompleteTaskDto) =>
    request<TaskInstanceData>(`/flow-tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delegateTask: (id: string, data: DelegateTaskDto) =>
    request<TaskInstanceData>(`/flow-tasks/${id}/delegate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRejectTargets: (id: string) =>
    request<RejectTargetNode[]>(`/flow-tasks/${id}/reject-targets`),

  rejectToNode: (id: string, data: RejectToNodeDto) =>
    request<TaskInstanceData>(`/flow-tasks/${id}/reject-to-node`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Users - 支持分页
  searchUsers: (q: string, page?: number, pageSize?: number) => {
    const params = new URLSearchParams({ q })
    if (page) params.set('page', String(page))
    if (pageSize) params.set('pageSize', String(pageSize))
    return request<{ items: Array<{ id: string; username: string; displayName: string; roles: string[] }>; total: number }>(`/users?${params}`)
  },

  // Roles - 新增
  searchRoles: (q: string, page?: number, pageSize?: number) => {
    const params = new URLSearchParams({ q })
    if (page) params.set('page', String(page))
    if (pageSize) params.set('pageSize', String(pageSize))
    return request<{ items: Array<{ id: string; name: string; description?: string }>; total: number }>(`/roles?${params}`)
  },

  // Approval logs
  getApprovalLogs: (instanceId: string) => {
    const params = new URLSearchParams({ instanceId })
    return request<ApprovalLogListData>(`/flow-approvals?${params}`)
  },

  // Published forms (editor-server)
  getPublishedForms: () =>
    request<Array<{ id: string; publishId: string; name: string }>>('/schemas/published'),

  // Templates
  listTemplates: (query?: FlowTemplateQuery) => {
    const params = new URLSearchParams()
    if (query?.search) params.set('search', query.search)
    if (query?.category) params.set('category', query.category)
    if (query?.isBuiltin !== undefined) params.set('isBuiltin', String(query.isBuiltin))
    if (query?.page) params.set('page', String(query.page))
    if (query?.pageSize) params.set('pageSize', String(query.pageSize))
    return request<{ items: FlowTemplateData[]; total: number }>(`/flow-templates?${params}`)
  },

  getTemplate: (id: string) =>
    request<FlowTemplateData>(`/flow-templates/${id}`),

  deleteTemplate: (id: string) =>
    request<null>(`/flow-templates/${id}`, { method: 'DELETE' }),

  applyTemplate: (id: string, data?: ApplyFlowTemplateDto) =>
    request<FlowDefinitionData>(`/flow-templates/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),

  seedBuiltinTemplates: () =>
    request<{ seeded: number }>('/flow-templates/seed', { method: 'POST' }),

  saveAsTemplate: (definitionId: string, data?: { name?: string; description?: string; category?: string; tags?: string[] }) =>
    request<FlowTemplateData>(`/flows/${definitionId}/save-as-template`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),

  // Monitor
  getMonitorStats: () =>
    request<FlowMonitorStats>('/flow-monitor/stats'),

  getMonitorAvgDuration: () =>
    request<FlowMonitorAvgDuration>('/flow-monitor/avg-duration'),

  getMonitorNodeStats: () =>
    request<FlowMonitorNodeStat[]>('/flow-monitor/node-stats'),

  getMonitorTrend: (days?: number) => {
    const params = new URLSearchParams()
    if (days) params.set('days', String(days))
    return request<FlowMonitorTrendPoint[]>(`/flow-monitor/trend?${params}`)
  },

  // Notifications
  getUnreadCount: () =>
    request<{ count: number }>('/notifications/unread-count'),

  getNotifications: (page?: number, pageSize?: number, isRead?: boolean) => {
    const params = new URLSearchParams()
    if (page) params.set('page', String(page))
    if (pageSize) params.set('pageSize', String(pageSize))
    if (isRead !== undefined) params.set('isRead', String(isRead))
    return request<{ items: Array<{ id: string; userId: string; type: string; title: string; content?: string; relatedId?: string; relatedType?: string; isRead: boolean; createdAt: string }>; total: number }>(`/notifications?${params}`)
  },

  markNotificationAsRead: (id: string) =>
    request<null>(`/notifications/${id}/read`, { method: 'POST' }),

  markAllNotificationsAsRead: () =>
    request<null>('/notifications/read-all', { method: 'POST' }),
}
