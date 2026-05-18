/**
 * FormGrid API 客户端
 *
 * 基于 fetch 的薄封装层，负责：
 * - 统一注入 Authorization / Sinosoft-Auth 请求头
 * - 解析 JSON 响应并检查 success 标志
 * - 统一错误格式（抛出 ApiError）
 * - 返回带类型的 Promise
 *
 * 使用前需要在应用入口调用 configureApiClient()
 */

import type {
  ApiResponse,
  PaginatedResponse,
  SchemaListItem,
  SchemaDetail,
  SchemaCreatePayload,
  SchemaUpdatePayload,
} from '@/types/api'

// ---- 配置状态（模块级单例） ----

let baseUrl = 'http://localhost:3001/api'
let getToken: (() => string) | null = null

// ---- 配置入口 ----

export interface ApiClientConfig {
  baseUrl?: string
  getToken?: () => string
}

export function configureApiClient(config: ApiClientConfig = {}): void {
  if (config.baseUrl) {
    baseUrl = config.baseUrl.replace(/\/+$/, '')
  }
  if (config.getToken) {
    getToken = config.getToken
  }
}

export function getBaseUrl(): string {
  return baseUrl
}

// ---- 专用 API 方法 ----

/**
 * GET /api/schemas?search=&type=&status=&publishId=&page=1&pageSize=20
 */
export function fetchSchemas(
  options?: {
    search?: string
    type?: string
    status?: string
    publishId?: string
    page?: number
    pageSize?: number
  },
): Promise<PaginatedResponse<SchemaListItem>> {
  const params = new URLSearchParams()
  params.set('page', String(options?.page ?? 1))
  params.set('pageSize', String(options?.pageSize ?? 20))
  if (options?.search) params.set('search', options.search)
  if (options?.type) params.set('type', options.type)
  if (options?.status) params.set('status', options.status)
  if (options?.publishId) params.set('publishId', options.publishId)

  return apiRequest<PaginatedResponse<SchemaListItem>>(
    'GET',
    `/schemas?${params.toString()}`,
  )
}

/**
 * GET /api/schemas/:id
 */
export function fetchSchemaById(id: string): Promise<SchemaDetail> {
  return apiRequest<SchemaDetail>('GET', `/schemas/${encodeURIComponent(id)}`)
}

/**
 * GET /api/schemas?publishId=xxx → returns the (first) published schema
 */
export async function fetchSchemaByPublishId(publishId: string): Promise<SchemaDetail> {
  const result = await fetchSchemas({ publishId, pageSize: 1 })
  if (result.items.length === 0) {
    throw new ApiError('Published schema not found', 404)
  }
  return fetchSchemaById(result.items[0].id)
}

/**
 * POST /api/schemas
 */
export function createSchema(payload: SchemaCreatePayload): Promise<SchemaDetail> {
  return apiRequest<SchemaDetail>('POST', '/schemas', payload)
}

/**
 * PUT /api/schemas/:id
 */
export function updateSchema(
  id: string,
  payload: SchemaUpdatePayload,
): Promise<SchemaDetail> {
  return apiRequest<SchemaDetail>(
    'PUT',
    `/schemas/${encodeURIComponent(id)}`,
    payload,
  )
}

/**
 * DELETE /api/schemas/:id
 */
export function deleteSchema(id: string): Promise<null> {
  return apiRequest<null>('DELETE', `/schemas/${encodeURIComponent(id)}`)
}

// ---- 内部实现 ----

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${baseUrl}${path}`

  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getToken?.() ?? ''
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    headers['Sinosoft-Auth'] = token
  }

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

  if (!json.success) {
    throw new ApiError(
      json.error?.message ?? `Request failed (HTTP ${response.status})`,
      response.status,
      json.error,
    )
  }

  return json.data as T
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
