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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

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
