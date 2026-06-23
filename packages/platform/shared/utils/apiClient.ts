/**
 * apiClient -- 共享 HTTP 客户端（基于 axios）
 *
 * 所有子项目（shell、editor、flow、ai-app、admin）统一使用此客户端。
 * - 请求拦截器：自动附加 Authorization header
 * - 响应拦截器：统一错误处理，401 触发 unauthorizedHandler
 */
import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

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

// ── axios 实例 ──

const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── 请求拦截器：自动附加 token ──

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenProvider?.()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── 响应拦截器：统一错误处理 ──

instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const json = response.data
    if (!json.success) {
      return Promise.reject(
        new ApiError(json.error?.message ?? 'Request failed', response.status, json.error?.details),
      )
    }
    return response
  },
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response

      // 401 清除认证状态并跳转登录页
      if (status === 401 && error.config?.url !== '/auth/login') {
        onUnauthorized?.()
        window.location.href = '/login'
        return Promise.reject(new ApiError('Authentication required', 401))
      }

      const message = (data as ApiResponse<unknown>)?.error?.message ?? error.message
      return Promise.reject(new ApiError(message, status))
    }

    // 网络错误等
    return Promise.reject(new ApiError(error.message ?? 'Network error', 0))
  },
)

// ── 对外 API ──

export const apiClient = {
  get: <T>(path: string) => instance.get<ApiResponse<T>>(path).then((r) => r.data.data as T),
  post: <T>(path: string, body?: unknown) => instance.post<ApiResponse<T>>(path, body).then((r) => r.data.data as T),
  put: <T>(path: string, body?: unknown) => instance.put<ApiResponse<T>>(path, body).then((r) => r.data.data as T),
  patch: <T>(path: string, body?: unknown) => instance.patch<ApiResponse<T>>(path, body).then((r) => r.data.data as T),
  delete: <T>(path: string) => instance.delete<ApiResponse<T>>(path).then((r) => r.data.data as T),
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export async function fetchSchemaById(id: string): Promise<{ id: string; name: string; json: unknown }> {
  return apiClient.get(`/schemas/${encodeURIComponent(id)}`)
}

export async function fetchLatestFlowVersion(definitionId: string): Promise<{ id: string; definitionId: string; version: string; graph: { nodes: unknown[]; edges: unknown[] }; metadata: unknown; createdAt: string; updatedAt: string }> {
  return apiClient.get(`/flows/${encodeURIComponent(definitionId)}/versions/latest`)
}
