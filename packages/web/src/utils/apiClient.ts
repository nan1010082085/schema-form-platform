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

// ---- 拦截器类型 ----

export interface RequestConfig {
  url: string
  method: string
  headers: Record<string, string>
  body?: unknown
  params?: Record<string, unknown>
}

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
export type ResponseInterceptor = <T>(data: T, response: Response) => T | Promise<T>

// ---- API 客户端类 ----

export class ApiClient {
  private baseUrl = 'http://localhost:3001/api'
  private getToken: (() => string) | null = null
  private useMock = false
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []

  configure(config: ApiClientConfig = {}): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    if (config.getToken) this.getToken = config.getToken
    if (config.useMock !== undefined) this.useMock = config.useMock
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

    const url = cfg.params
      ? `${cfg.url}?${new URLSearchParams(cfg.params as Record<string, string>).toString()}`
      : cfg.url

    let response: Response
    try {
      response = await fetch(url, {
        method: cfg.method,
        headers: cfg.headers,
        body: cfg.body !== undefined ? JSON.stringify(cfg.body) : undefined,
      })
    } catch (err) {
      throw new ApiError(
        `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        0,
      )
    }

    // 401: 自动登出并跳转登录页（本地开发跳过）
    if (response.status === 401 && !import.meta.env.DEV) {
      const { useAuthStore } = await import('@/stores/auth')
      useAuthStore().logout()
      const { useRouter } = await import('vue-router')
      useRouter().push({ name: 'login' })
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
   * 发送请求到完整 URL（不拼接 baseUrl）。
   * 供数据源等外部配置的 URL 使用（如 schema apiConfig.url）。
   */
  async requestUrl<T>(method: string, url: string, bodyOrParams?: unknown): Promise<T> {
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

    return this.request<T>({ url, method: method.toUpperCase(), headers, body, params })
  }

  isMockEnabled(): boolean {
    return this.useMock
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

export async function fetchVersions(editId: string): Promise<VersionListResponse> {
  return apiClient.get<VersionListResponse>(
    `/schemas/${encodeURIComponent(editId)}/versions`,
  )
}

export async function fetchVersion(editId: string, version: string): Promise<SchemaDetail> {
  return apiClient.get<SchemaDetail>(
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
  return apiClient.get<DictItem[]>(`/dict/${encodeURIComponent(code)}`)
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

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', payload)
}

export async function logout(): Promise<null> {
  return apiClient.post<null>('/auth/logout')
}

export async function fetchCurrentUser(): Promise<LoginResponse['user']> {
  return apiClient.get<LoginResponse['user']>('/auth/me')
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
