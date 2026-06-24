/**
 * Data API — 数据/实例/凭据/租户相关接口
 *
 * 聚合表单数据、提交记录、凭据管理、租户管理等接口。
 * 底层委托 utils/apiClient。
 */
import { apiClient } from '@/utils/apiClient'
import type { PaginatedResponse } from '@/types/api'
import type {
  CredentialItem,
  CredentialDetail,
  CredentialCreatePayload,
  CredentialUpdatePayload,
} from '@/types/credential'
import type {
  TenantItem,
  TenantStatus,
  TenantCreatePayload,
  TenantUpdatePayload,
} from '@/types/tenant'

// ---- 数据/提交记录 ----

export {
  fetchDataList,
  fetchDataById,
  fetchMockData,
  fetchSubmissions,
  fetchSubmissionDetail,
  deleteSubmission,
  updateSubmissionStatus,
  batchDeleteSubmissions,
  batchUpdateSubmissionsStatus,
  exportSubmissionsCsv,
  exportSubmissions,
  fetchFlowInstances,
  fetchFlowInstanceById,
  fetchApprovalLogs,
  fetchLatestFlowVersion,
} from '@/utils/apiClient'

export type {
  FlowInstanceItem,
  ApprovalLogItem,
  FlowVersionItem,
  SubmissionItem,
  ExportFormat,
} from '@/utils/apiClient'

// ---- 凭据管理 ----

export async function fetchCredentials(params?: {
  page?: number
  pageSize?: number
  search?: string
  type?: string
}): Promise<PaginatedResponse<CredentialItem>> {
  const queryParams: Record<string, string> = {
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  }
  if (params?.search) queryParams.search = params.search
  if (params?.type) queryParams.type = params.type
  return apiClient.get<PaginatedResponse<CredentialItem>>('/credentials', queryParams)
}

export async function fetchCredentialById(id: string): Promise<CredentialDetail> {
  return apiClient.get<CredentialDetail>(`/credentials/${encodeURIComponent(id)}`)
}

export async function createCredential(payload: CredentialCreatePayload): Promise<CredentialItem> {
  return apiClient.post<CredentialItem>('/credentials', payload)
}

export async function updateCredential(id: string, payload: CredentialUpdatePayload): Promise<CredentialItem> {
  return apiClient.put<CredentialItem>(`/credentials/${encodeURIComponent(id)}`, payload)
}

export async function deleteCredential(id: string): Promise<null> {
  return apiClient.delete<null>(`/credentials/${encodeURIComponent(id)}`)
}

// ---- 租户管理 ----

export async function fetchTenants(params?: {
  page?: number
  pageSize?: number
  search?: string
  status?: TenantStatus | ''
}): Promise<PaginatedResponse<TenantItem>> {
  const queryParams: Record<string, string> = {
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  }
  if (params?.search) queryParams.search = params.search
  if (params?.status) queryParams.status = params.status
  return apiClient.get<PaginatedResponse<TenantItem>>('/tenants', queryParams)
}

export async function createTenant(payload: TenantCreatePayload): Promise<TenantItem> {
  return apiClient.post<TenantItem>('/tenants', payload)
}

export async function updateTenant(id: string, payload: TenantUpdatePayload): Promise<TenantItem> {
  return apiClient.put<TenantItem>(`/tenants/${encodeURIComponent(id)}`, payload)
}

export async function deleteTenant(id: string): Promise<null> {
  return apiClient.delete<null>(`/tenants/${encodeURIComponent(id)}`)
}

// ---- 流程操作 ----

/**
 * 发起流程实例
 *
 * @param definitionId - 流程定义 ID
 * @param variables - 流程变量
 */
export async function startFlow(
  definitionId: string,
  variables: Record<string, unknown> = {},
): Promise<unknown> {
  return apiClient.requestUrl<unknown>('post', '/flow-instances', {
    definitionId,
    variables,
  })
}

/**
 * 终止流程实例
 *
 * @param instanceId - 流程实例 ID
 * @param reason - 终止原因（可选）
 */
export async function terminateFlow(
  instanceId: string,
  reason?: string,
): Promise<unknown> {
  return apiClient.requestUrl<unknown>(
    'post',
    `/flow-instances/${instanceId}/terminate`,
    reason ? { reason } : undefined,
  )
}
