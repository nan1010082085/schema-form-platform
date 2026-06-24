/**
 * Runtime API — 运行时/Schema 配置的动态 URL 请求
 *
 * 供 widget、composable、editor 组件调用 schema 中配置的外部 API URL。
 * 底层委托 utils/apiClient，统一 token 注入和错误处理。
 */
import { apiClient } from '@/utils/apiClient'

/**
 * 发送请求到 schema 配置的 URL（不拼接 baseUrl）
 *
 * @param method - HTTP 方法
 * @param url - 完整 URL
 * @param params - GET 参数或 POST body
 * @param headers - 自定义请求头
 * @param timeout - 超时时间（毫秒）
 */
export async function fetchRuntimeUrl<T = unknown>(
  method: string,
  url: string,
  params?: unknown,
  headers?: Record<string, string>,
  timeout?: number,
): Promise<T> {
  return apiClient.requestUrl<T>(method, url, params, headers, timeout)
}
