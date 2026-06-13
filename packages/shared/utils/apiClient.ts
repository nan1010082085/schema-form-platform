/**
 * apiClient -- 共享 HTTP 客户端
 *
 * 所有子项目（portal、shell、editor、flow、ai-app）统一使用此客户端。
 * - 自动附加 Authorization header（通过 tokenProvider 注入）
 * - 非成功响应抛出 ApiError
 * - 401 触发 unauthorizedHandler 回调并跳转登录页
 */
export class ApiError extends Error {
  public readonly status: number
  public readonly details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: { message: string; details?: unknown }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/schema-platform/api'

/** Token 提供者，由 useAuth 注入，避免 apiClient 直接耦合 store */
let tokenProvider: (() => string | null) | null = null

/** 401 回调，由 useAuth 注入，用于清除认证状态 */
let onUnauthorized: (() => void) | null = null

export function setTokenProvider(provider: () => string | null): void {
  tokenProvider = provider
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const token = tokenProvider?.()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // 401 清除认证状态并跳转登录页
  if (response.status === 401 && path !== '/auth/login') {
    onUnauthorized?.()
    window.location.href = '/login'
    throw new ApiError('Authentication required', 401)
  }

  const json = (await response.json()) as ApiResponse<T>

  if (!json.success) {
    throw new ApiError(json.error?.message ?? 'Request failed', response.status, json.error?.details)
  }

  return json.data
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

// ── Workflow API ──

export interface WorkflowItem {
  id: string
  name: string
  description: string
  status: 'draft' | 'published' | 'archived'
  formSchemaId: string
  flowDefinitionId: string
  dataUpdateRules: Array<{
    trigger: string
    targetField: string
    sourceField: string
    transform?: string
  }>
  publishConfig: {
    entryUrl: string
    permissions: { launchers: string[]; viewers: string[] }
  }
  createdAt: string
  updatedAt: string
}

export interface WorkflowTemplateItem {
  id: string
  name: string
  description: string
  category: string
  formSchema: unknown
  flowDefinition: { nodes: unknown[]; edges: unknown[] }
  dataUpdateRules: Array<{
    trigger: string
    targetField: string
    sourceField: string
    transform?: string
  }>
  thumbnail: string
  tags: string[]
  isBuiltin: boolean
  useCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FlowVersionItem {
  id: string
  definitionId: string
  version: string
  graph: { nodes: unknown[]; edges: unknown[] }
  metadata: unknown
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export async function fetchWorkflows(options?: {
  status?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<WorkflowItem>> {
  const params = new URLSearchParams()
  if (options?.status) params.set('status', options.status)
  if (options?.page) params.set('page', String(options.page))
  if (options?.pageSize) params.set('pageSize', String(options.pageSize))
  const qs = params.toString()
  return apiClient.get<PaginatedResponse<WorkflowItem>>(`/workflows${qs ? `?${qs}` : ''}`)
}

export async function fetchWorkflowById(id: string): Promise<WorkflowItem> {
  return apiClient.get<WorkflowItem>(`/workflows/${encodeURIComponent(id)}`)
}

export async function deleteWorkflow(id: string): Promise<void> {
  return apiClient.delete<void>(`/workflows/${encodeURIComponent(id)}`)
}

export async function toggleWorkflowStatus(
  id: string,
  status: 'published' | 'archived',
): Promise<WorkflowItem> {
  return apiClient.put<WorkflowItem>(`/workflows/${encodeURIComponent(id)}/status`, { status })
}

export async function duplicateWorkflow(id: string): Promise<WorkflowItem> {
  return apiClient.post<WorkflowItem>(`/workflows/${encodeURIComponent(id)}/duplicate`)
}

export async function fetchWorkflowTemplates(options?: {
  search?: string
  category?: string
  isBuiltin?: boolean
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<WorkflowTemplateItem>> {
  const params = new URLSearchParams()
  if (options?.search) params.set('search', options.search)
  if (options?.category) params.set('category', options.category)
  if (options?.isBuiltin !== undefined) params.set('isBuiltin', String(options.isBuiltin))
  if (options?.page) params.set('page', String(options.page))
  if (options?.pageSize) params.set('pageSize', String(options.pageSize))
  const qs = params.toString()
  return apiClient.get<PaginatedResponse<WorkflowTemplateItem>>(`/workflow-templates${qs ? `?${qs}` : ''}`)
}

export async function fetchWorkflowTemplateById(id: string): Promise<WorkflowTemplateItem> {
  return apiClient.get<WorkflowTemplateItem>(`/workflow-templates/${encodeURIComponent(id)}`)
}

export async function useWorkflowTemplate(
  id: string,
  payload?: { name?: string; description?: string },
): Promise<{ workflow: WorkflowItem }> {
  return apiClient.post(`/workflow-templates/${encodeURIComponent(id)}/use`, payload ?? {})
}

export async function fetchSchemaById(id: string): Promise<{ id: string; name: string; json: unknown }> {
  return apiClient.get(`/schemas/${encodeURIComponent(id)}`)
}

export async function fetchLatestFlowVersion(definitionId: string): Promise<FlowVersionItem> {
  return apiClient.get<FlowVersionItem>(`/flows/${encodeURIComponent(definitionId)}/versions/latest`)
}

export async function startWorkflow(
  id: string,
  data: Record<string, unknown>,
): Promise<{ instanceId: string }> {
  return apiClient.post(`/workflows/${encodeURIComponent(id)}/start`, { data })
}
