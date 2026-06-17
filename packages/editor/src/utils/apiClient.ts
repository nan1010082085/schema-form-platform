/**
 * 统一 API 客户端
 *
 * 基于 fetch 的请求封装，支持：
 * - 请求/响应拦截器链
 * - 统一 token/cookie 注入
 * - 数据源数据转换（dataPath / labelKey / valueKey）
 * - 统一错误格式（ApiError）
 * - Mock 降级
 */

import type {
  ApiResponse,
  PaginatedResponse,
  SchemaListItem,
  SchemaDetail,
  PublishedSchemaItem,
  SchemaCreatePayload,
  SchemaUpdatePayload,
} from '@/types/api'
import { executeWithRetry, type RetryOptions } from './retryRequest'

// ---- 拦截器类型 ----

export interface RequestConfig {
  url: string
  method: string
  headers: Record<string, string>
  body?: unknown
  params?: Record<string, unknown>
  signal?: AbortSignal
}

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
export type ResponseInterceptor = <T>(data: T, response: Response) => T | Promise<T>

// ---- API 客户端类 ----

export class ApiClient {
  private baseUrl = '/schema-platform/api'
  private getToken: (() => string) | null = null
  private useMock = false
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private retryOptions: RetryOptions = { enableRetry: true, maxRetries: 2, delayMs: 1000 }

  configure(config: ApiClientConfig = {}): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    if (config.getToken) this.getToken = config.getToken
    if (config.useMock !== undefined) this.useMock = config.useMock
    if (config.retry !== undefined) this.retryOptions = { ...this.retryOptions, ...config.retry }
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  addRequestInterceptor(fn: RequestInterceptor): void {
    this.requestInterceptors.push(fn)
  }

  addResponseInterceptor(fn: ResponseInterceptor): void {
    this.responseInterceptors.push(fn)
  }

  async request<T>(config: RequestConfig): Promise<T> {
    // 执行请求拦截器链
    let cfg = { ...config }
    for (const interceptor of this.requestInterceptors) {
      cfg = await interceptor(cfg)
    }

    const doFetch = async (): Promise<T> => {
      const url = cfg.params
        ? `${cfg.url}?${new URLSearchParams(cfg.params as Record<string, string>).toString()}`
        : cfg.url

      let response: Response
      try {
        response = await fetch(url, {
          method: cfg.method,
          headers: cfg.headers,
          body: cfg.body !== undefined ? JSON.stringify(cfg.body) : undefined,
          signal: cfg.signal,
        })
      } catch (err) {
        throw new ApiError(
          `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          0,
        )
      }

      let json: ApiResponse<T>
      try {
        json = (await response.json()) as ApiResponse<T>
      } catch {
        throw new ApiError(
          `Invalid JSON response (HTTP ${response.status})`,
          response.status,
        )
      }

      // 401: 直接抛出错误，不再自动跳转登录页
      if (response.status === 401) {
        throw new ApiError(
          json.error?.message ?? 'Unauthorized',
          401,
          json.error,
        )
      }

      // 5xx 服务器错误：抛出可重试的错误
      if (response.status >= 500) {
        throw new ApiError(
          json.error?.message ?? `Server error (HTTP ${response.status})`,
          response.status,
          json.error,
        )
      }

      if (!json.success) {
        throw new ApiError(
          json.error?.message ?? `Request failed (HTTP ${response.status})`,
          response.status,
          json.error,
        )
      }

      let data = json.data as T

      // 执行响应拦截器链
      for (const interceptor of this.responseInterceptors) {
        data = await interceptor(data, response)
      }

      return data
    }

    // 对网络错误和 5xx 服务器错误启用重试
    return executeWithRetry(doFetch, this.retryOptions)
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.buildAndSend<T>('GET', path, undefined, params)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.buildAndSend<T>('POST', path, body)
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.buildAndSend<T>('PUT', path, body)
  }

  async delete<T>(path: string): Promise<T> {
    return this.buildAndSend<T>('DELETE', path)
  }

  /**
   * 发送请求到外部 URL，不做 ApiResponse 包装解析，直接返回原始 JSON。
   * 用于 actionExecutor / requestQueue 等调用用户配置的外部 API 场景。
   * 会自动注入 token。
   */
  async requestRaw<T>(
    method: string,
    url: string,
    bodyOrParams?: unknown,
    customHeaders?: Record<string, string>,
  ): Promise<T> {
    const headers: Record<string, string> = {}
    const token = this.getToken?.() ?? ''
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      headers['Sinosoft-Auth'] = token
    }

    const isGet = method.toUpperCase() === 'GET'
    const params = isGet ? (bodyOrParams as Record<string, unknown>) : undefined
    const body = isGet ? undefined : bodyOrParams

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    if (customHeaders) {
      Object.assign(headers, customHeaders)
    }

    const fullUrl = params
      ? `${url}?${new URLSearchParams(params as Record<string, string>).toString()}`
      : url

    const response = await fetch(fullUrl, {
      method: method.toUpperCase(),
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    return response.json() as Promise<T>
  }

  /**
   * 发送请求到完整 URL（不拼接 baseUrl）。
   * 供数据源等外部配置的 URL 使用（如 schema apiConfig.url）。
   */
  async requestUrl<T>(
    method: string,
    url: string,
    bodyOrParams?: unknown,
    customHeaders?: Record<string, string>,
    timeout?: number,
  ): Promise<T> {
    const headers: Record<string, string> = {}
    const token = this.getToken?.() ?? ''
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      headers['Sinosoft-Auth'] = token
    }

    const isGet = method.toUpperCase() === 'GET'
    const params = isGet ? (bodyOrParams as Record<string, unknown>) : undefined
    const body = isGet ? undefined : bodyOrParams

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    // 合并自定义 headers（customHeaders 覆盖默认值）
    if (customHeaders) {
      Object.assign(headers, customHeaders)
    }

    // 超时控制
    if (timeout && timeout > 0) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)
      try {
        return await this.request<T>({ url, method: method.toUpperCase(), headers, body, params, signal: controller.signal })
      } finally {
        clearTimeout(timer)
      }
    }

    return this.request<T>({ url, method: method.toUpperCase(), headers, body, params })
  }

  isMockEnabled(): boolean {
    return this.useMock
  }

  /** 获取当前 token（供外部需要手动构建请求时使用） */
  getTokenValue(): string {
    return this.getToken?.() ?? ''
  }

  private async buildAndSend<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {}

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const token = this.getToken?.() ?? ''
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      headers['Sinosoft-Auth'] = token
    }

    return this.request<T>({ url, method, headers, body, params })
  }
}

// ---- 单例 ----

export const apiClient = new ApiClient()

// ---- 向后兼容的配置入口 ----

export interface ApiClientConfig {
  baseUrl?: string
  getToken?: () => string
  useMock?: boolean
  retry?: RetryOptions
}

export function configureApiClient(config: ApiClientConfig = {}): void {
  apiClient.configure(config)
}

export function getBaseUrl(): string {
  return apiClient.getBaseUrl()
}

// ---- Schema CRUD ----

export async function fetchSchemas(
  options?: {
    search?: string
    type?: string
    page?: number
    pageSize?: number
  },
): Promise<PaginatedResponse<SchemaListItem>> {
  if (apiClient.isMockEnabled()) {
    const { mockFetchSchemas } = await import('./mockApi')
    return mockFetchSchemas(options)
  }
  const params: Record<string, string> = {
    page: String(options?.page ?? 1),
    pageSize: String(options?.pageSize ?? 20),
  }
  if (options?.search) params.search = options.search
  if (options?.type) params.type = options.type
  return apiClient.get<PaginatedResponse<SchemaListItem>>('/schemas', params)
}

export async function fetchSchemaById(id: string): Promise<SchemaDetail> {
  if (apiClient.isMockEnabled()) {
    const { mockFetchSchemaById } = await import('./mockApi')
    return mockFetchSchemaById(id)
  }
  return apiClient.get<SchemaDetail>(`/schemas/${encodeURIComponent(id)}`)
}

export async function publishSchema(id: string, version?: string): Promise<PublishedSchemaItem> {
  if (apiClient.isMockEnabled()) {
    const { mockPublishSchema } = await import('./mockApi')
    return mockPublishSchema(id)
  }
  return apiClient.post<PublishedSchemaItem>(
    `/schemas/${encodeURIComponent(id)}/publish`,
    version ? { version } : undefined,
  )
}

export async function fetchPublishedByPublishId(publishId: string): Promise<PublishedSchemaItem | null> {
  if (apiClient.isMockEnabled()) {
    const { mockFetchPublishedSchema } = await import('./mockApi')
    return mockFetchPublishedSchema(publishId)
  }
  try {
    return await apiClient.get<PublishedSchemaItem>(
      `/schemas/published/by-publish-id/${encodeURIComponent(publishId)}`,
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function fetchPublishedSchema(editId: string): Promise<PublishedSchemaItem | null> {
  if (apiClient.isMockEnabled()) {
    const { mockFetchPublishedSchema } = await import('./mockApi')
    return mockFetchPublishedSchema(editId)
  }
  try {
    return await apiClient.get<PublishedSchemaItem>(
      `/schemas/published/${encodeURIComponent(editId)}`,
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function createSchema(payload: SchemaCreatePayload): Promise<SchemaDetail> {
  if (apiClient.isMockEnabled()) {
    const { mockCreateSchema } = await import('./mockApi')
    return mockCreateSchema(payload)
  }
  return apiClient.post<SchemaDetail>('/schemas', payload)
}

export async function updateSchema(
  id: string,
  payload: SchemaUpdatePayload,
): Promise<SchemaDetail> {
  if (apiClient.isMockEnabled()) {
    const { mockUpdateSchema } = await import('./mockApi')
    return mockUpdateSchema(id, payload)
  }
  return apiClient.put<SchemaDetail>(`/schemas/${encodeURIComponent(id)}`, payload)
}

export async function deleteSchema(id: string): Promise<null> {
  if (apiClient.isMockEnabled()) {
    const { mockDeleteSchema } = await import('./mockApi')
    return mockDeleteSchema(id)
  }
  return apiClient.delete<null>(`/schemas/${encodeURIComponent(id)}`)
}

// ---- 版本管理 ----

export interface VersionEntry {
  id: string
  version: string
  createdAt: string
  published: boolean
}

export interface VersionListResponse {
  items: VersionEntry[]
  total: number
}

export async function fetchVersions(editId: string, page?: number, pageSize?: number): Promise<VersionListResponse> {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  if (pageSize) params.set('pageSize', String(pageSize))
  const qs = params.toString()
  return apiClient.get<VersionListResponse>(
    `/schemas/${encodeURIComponent(editId)}/versions${qs ? `?${qs}` : ''}`,
  )
}

export async function fetchVersion(editId: string, version: string): Promise<SchemaDetail> {
  return apiClient.get<SchemaDetail>(
    `/schemas/${encodeURIComponent(editId)}/versions/${encodeURIComponent(version)}`,
  )
}

export async function deleteVersion(editId: string, version: string): Promise<null> {
  return apiClient.delete<null>(
    `/schemas/${encodeURIComponent(editId)}/versions/${encodeURIComponent(version)}`,
  )
}

// ---- 导入 ----

export interface SchemaImportPayload {
  name: string
  type: string
  json: unknown[]
}

export async function importSchema(payload: SchemaImportPayload): Promise<SchemaDetail> {
  return apiClient.post<SchemaDetail>('/schemas/import', payload)
}

// ---- 数据源 ----

export interface DictItem {
  label: string
  value: string
  id?: string
  children?: DictItem[]
}

export async function fetchDictByCode(code: string): Promise<DictItem[]> {
  return apiClient.get<DictItem[]>(`/dict/data/by-type/${encodeURIComponent(code)}`)
}

export async function fetchDataList(
  params?: Record<string, unknown>,
): Promise<PaginatedResponse<Record<string, unknown>>> {
  return apiClient.get<PaginatedResponse<Record<string, unknown>>>('/data/list', params)
}

export async function fetchDataById(id: string): Promise<Record<string, unknown>> {
  return apiClient.get<Record<string, unknown>>(`/data/${encodeURIComponent(id)}`)
}

export async function fetchMockData(schemaId: string): Promise<Record<string, unknown>> {
  return apiClient.get<Record<string, unknown>>(`/mock/${encodeURIComponent(schemaId)}`)
}

// ---- 模板 ----

export type TemplateCategory = 'form' | 'layout' | 'table' | 'search' | 'chart' | 'business' | 'report' | 'other'

export interface TemplateItem {
  id: string
  name: string
  description: string
  category: TemplateCategory
  widgetType: string
  thumbnail: string
  widgets: Record<string, unknown>[]
  tags: string[]
  isBuiltin: boolean
  createdBy: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface TemplateApplyResult {
  name: string
  widgets: Record<string, unknown>[]
}

export async function fetchTemplates(params?: {
  search?: string
  category?: string
  tag?: string
  widgetType?: string
  isBuiltin?: boolean
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<TemplateItem>> {
  const query: Record<string, string> = {
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  }
  if (params?.search) query.search = params.search
  if (params?.category) query.category = params.category
  if (params?.tag) query.tag = params.tag
  if (params?.widgetType) query.widgetType = params.widgetType
  if (params?.isBuiltin !== undefined) query.isBuiltin = String(params.isBuiltin)
  return apiClient.get<PaginatedResponse<TemplateItem>>('/templates', query)
}

export async function applyTemplate(id: string): Promise<TemplateApplyResult> {
  return apiClient.post<TemplateApplyResult>(`/templates/${encodeURIComponent(id)}/apply`)
}

export async function createTemplate(payload: {
  name: string
  description?: string
  category?: string
  widgetType?: string
  thumbnail?: string
  widgets: Record<string, unknown>[]
  tags?: string[]
  isBuiltin?: boolean
}): Promise<TemplateItem> {
  return apiClient.post<TemplateItem>('/templates', payload)
}

export async function deleteTemplate(id: string): Promise<null> {
  return apiClient.delete<null>(`/templates/${encodeURIComponent(id)}`)
}

// ---- 认证 ----

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    username: string
    displayName: string
    role: string
  }
}

export interface CurrentUser {
  id: string
  username: string
  displayName: string
  roles: string[]
  permissions: string[]
  tenantId: string
  deptId: string | null
  avatar: string
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', payload)
}

export async function logout(): Promise<null> {
  return apiClient.post<null>('/auth/logout')
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return apiClient.get<CurrentUser>('/auth/me')
}

// ---- 流程实例 ----

export interface FlowInstanceItem {
  id: string
  definitionId: string
  definitionName?: string
  versionId: string
  version: string
  status: 'running' | 'completed' | 'terminated' | 'suspended' | 'failed'
  variables: Record<string, unknown>
  tokens: Array<{
    tokenId: string
    nodeId: string
    parentTokenId: string | null
    state: 'active' | 'waiting' | 'completed'
    createdAt: string
    waitingSince: string | null
  }>
  initiatedBy: string
  startedAt: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export async function fetchFlowInstances(
  options?: { definitionId?: string; status?: string; page?: number; pageSize?: number },
): Promise<PaginatedResponse<FlowInstanceItem>> {
  const params: Record<string, string> = {
    page: String(options?.page ?? 1),
    pageSize: String(options?.pageSize ?? 20),
  }
  if (options?.definitionId) params.definitionId = options.definitionId
  if (options?.status) params.status = options.status
  return apiClient.get<PaginatedResponse<FlowInstanceItem>>('/flow-instances', params)
}

export async function fetchFlowInstanceById(id: string): Promise<FlowInstanceItem> {
  return apiClient.get<FlowInstanceItem>(`/flow-instances/${encodeURIComponent(id)}`)
}

// ---- 审批日志 ----

export interface ApprovalLogItem {
  id: string
  instanceId: string
  nodeId: string
  nodeName: string
  taskId: string
  action: string
  operator: string
  comment: string | null
  outcome: string | null
  createdAt: string
}

export async function fetchApprovalLogs(instanceId: string): Promise<ApprovalLogItem[]> {
  return apiClient.get<ApprovalLogItem[]>('/flow-approvals', { instanceId })
}

// ---- 流程定义版本（含图数据）----

export interface FlowVersionItem {
  id: string
  definitionId: string
  version: string
  graph: { nodes: unknown[]; edges: unknown[] }
  metadata: unknown
  createdAt: string
  updatedAt: string
}

export async function fetchLatestFlowVersion(definitionId: string): Promise<FlowVersionItem> {
  return apiClient.get<FlowVersionItem>(
    `/flows/${encodeURIComponent(definitionId)}/versions/latest`,
  )
}

// ---- 表单提交数据 ----

export interface SubmissionItem {
  id: string
  schemaId: string
  data: Record<string, unknown>
  submitterId: string | null
  status: 'submitted' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
}

export async function fetchSubmissions(
  schemaId: string,
  options?: { status?: string; page?: number; pageSize?: number },
): Promise<PaginatedResponse<SubmissionItem>> {
  const params: Record<string, string> = {
    page: String(options?.page ?? 1),
    pageSize: String(options?.pageSize ?? 20),
  }
  if (options?.status) params.status = options.status
  return apiClient.get<PaginatedResponse<SubmissionItem>>(
    `/submissions/${encodeURIComponent(schemaId)}`,
    params,
  )
}

export async function fetchSubmissionDetail(schemaId: string, id: string): Promise<SubmissionItem> {
  return apiClient.get<SubmissionItem>(
    `/submissions/${encodeURIComponent(schemaId)}/${encodeURIComponent(id)}`,
  )
}

export async function deleteSubmission(schemaId: string, id: string): Promise<null> {
  return apiClient.delete<null>(
    `/submissions/${encodeURIComponent(schemaId)}/${encodeURIComponent(id)}`,
  )
}

export async function updateSubmissionStatus(
  schemaId: string,
  id: string,
  status: 'submitted' | 'approved' | 'rejected',
): Promise<SubmissionItem> {
  return apiClient.request<SubmissionItem>({
    url: `${apiClient.getBaseUrl()}/submissions/${encodeURIComponent(schemaId)}/${encodeURIComponent(id)}/status`,
    method: 'PATCH',
    headers: (() => {
      const h: Record<string, string> = { 'Content-Type': 'application/json' }
      const token = apiClient.getTokenValue()
      if (token) {
        h['Authorization'] = `Bearer ${token}`
        h['Sinosoft-Auth'] = token
      }
      return h
    })(),
    body: { status },
  })
}

export async function batchDeleteSubmissions(schemaId: string, ids: string[]): Promise<{ deletedCount: number }> {
  return apiClient.post<{ deletedCount: number }>(
    `/submissions/${encodeURIComponent(schemaId)}/batch/delete`,
    { ids },
  )
}

export async function batchUpdateSubmissionsStatus(
  schemaId: string,
  ids: string[],
  status: 'submitted' | 'approved' | 'rejected',
): Promise<{ modifiedCount: number }> {
  return apiClient.post<{ modifiedCount: number }>(
    `/submissions/${encodeURIComponent(schemaId)}/batch/status`,
    { ids, status },
  )
}

export type ExportFormat = 'csv' | 'xlsx'

export async function exportSubmissionsCsv(schemaId: string, status?: string): Promise<Blob> {
  return exportSubmissions(schemaId, 'csv', status)
}

export async function exportSubmissions(
  schemaId: string,
  format: ExportFormat,
  status?: string,
): Promise<Blob> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  params.set('format', format)
  const qs = params.toString()
  const url = `${apiClient.getBaseUrl()}/submissions/${encodeURIComponent(schemaId)}/export?${qs}`
  const headers: Record<string, string> = {}
  const token = apiClient.getTokenValue()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    headers['Sinosoft-Auth'] = token
  }
  const response = await fetch(url, { headers })
  if (!response.ok) {
    const json = await response.json().catch(() => null)
    throw new ApiError(json?.error?.message ?? 'Export failed', response.status)
  }
  return response.blob()
}

// ---- 错误类型 ----

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
