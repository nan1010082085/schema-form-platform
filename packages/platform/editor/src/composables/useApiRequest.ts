/**
 * useApiRequest -- 通用 API 请求 composable
 *
 * 封装 fetch 请求，支持自定义 URL、方法、Headers。
 * 返回解析后的 JSON 数据。
 */
import { genericFetchApi } from '@/api/requestApi'

export function useApiRequest() {
  async function fetchApi(
    url: string,
    method: string = 'get',
    headers: Record<string, string> = {},
    params?: unknown,
  ): Promise<unknown> {
    return genericFetchApi(url, method, headers, params)
  }

  return { fetchApi }
}
