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

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

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
  delete: <T>(path: string) => request<T>('DELETE', path),
}
