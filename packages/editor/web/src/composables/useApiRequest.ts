/**
 * useApiRequest -- 通用 API 请求 composable
 *
 * 封装 fetch 请求，支持自定义 URL、方法、Headers。
 * 返回解析后的 JSON 数据。
 */
export function useApiRequest() {
  async function fetchApi(
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

  return { fetchApi }
}
