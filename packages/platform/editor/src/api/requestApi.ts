/**
 * Generic Request API — 通用请求接口
 *
 * 提供底层 fetch 封装，供 composable 层调用。
 * 所有外部 API 请求必须经过 src/api/ 目录聚合。
 */
import { apiClient } from '@/utils/apiClient'

export async function genericFetchApi(
  url: string,
  method: string = 'get',
  headers: Record<string, string> = {},
  params?: unknown,
): Promise<unknown> {
  const upperMethod = method.toUpperCase()
  const fetchOptions: RequestInit = {
    method: upperMethod,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (params && ['POST', 'PUT', 'PATCH'].includes(upperMethod)) {
    fetchOptions.body = JSON.stringify(params)
  }

  const response = await window.fetch(url, fetchOptions)

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * 请求外部 URL（完整地址），自动注入 token。
 * 用于数据源动态选项加载、API 测试连接等场景。
 */
export async function requestExternalUrl<T>(
  method: string,
  url: string,
  bodyOrParams?: unknown,
  headers?: Record<string, string>,
  timeout?: number,
): Promise<T> {
  return apiClient.requestUrl<T>(method, url, bodyOrParams, headers, timeout)
}
