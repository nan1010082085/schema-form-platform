/** useWorkerRequest — fetch 请求封装 */
import { ref, readonly, type Ref } from 'vue'
import { useLogger } from './useLogger'
import { genericFetchApi } from '@/api/requestApi'

export interface RequestConfig {
  url: string
  method?: 'get' | 'post'
  params?: Record<string, unknown>
  headers?: Record<string, string>
  dataPath?: string
}

export interface WorkerRequestAPI {
  request: (config: RequestConfig) => Promise<unknown>
  pendingCount: Readonly<Ref<number>>
}

function extractByPath(data: unknown, path: string): unknown {
  return path.split('.').reduce((obj, key) => {
    if (obj && typeof obj === 'object' && key in obj) {
      return (obj as Record<string, unknown>)[key]
    }
    return undefined
  }, data)
}

export function useWorkerRequest(): WorkerRequestAPI {
  const logger = useLogger('WorkerRequest')
  const pendingCount = ref(0)

  async function request(config: RequestConfig): Promise<unknown> {
    pendingCount.value++
    try {
      const { url, method = 'get', params, headers, dataPath } = config
      let requestUrl = url
      const mergedHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers }

      if (method === 'get' && params) {
        const searchParams = new URLSearchParams()
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value))
          }
        }
        const separator = url.includes('?') ? '&' : '?'
        requestUrl = `${url}${separator}${searchParams.toString()}`
      }

      let data: unknown = await genericFetchApi(
        requestUrl,
        method,
        mergedHeaders,
        method === 'get' ? undefined : params,
      )
      if (dataPath) {
        const extracted = extractByPath(data, dataPath)
        if (extracted !== undefined) data = extracted
      }
      return data
    } catch (e) {
      logger.error('request failed:', e)
      throw e
    } finally {
      pendingCount.value--
    }
  }

  return { request, pendingCount: readonly(pendingCount) }
}
