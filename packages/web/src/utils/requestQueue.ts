/**
 * 请求队列
 * 遍历 Schema 树收集 API 任务，顺序执行请求
 */
import type { FormSchemaItem, DictItem } from '@/components/FormGrid/types'
import { getRequestInstance } from './request'
import { setCachedOptions, getCachedOptions } from './optionsCache'
import { useLogger } from '@/composables/useLogger'

const logger = useLogger('RequestQueue')

interface QueueTask {
  key: string
  url: string
  method: 'get' | 'post'
  params?: Record<string, unknown>
  labelKey: string
  valueKey: string
}

/** 构建去重 key */
function buildTaskKey(url: string, method: string, params?: Record<string, unknown>): string {
  return `${method}:${url}:${JSON.stringify(params ?? {})}`
}

/** 递归收集 Schema 树中的 API 任务 */
export function collectApiTasks(schema: FormSchemaItem[]): QueueTask[] {
  const taskMap = new Map<string, QueueTask>()

  function walk(items: FormSchemaItem[]) {
    for (const item of items) {
      if (item.api?.url && !item.api.dictCode) {
        const method = item.api.method ?? 'get'
        const key = buildTaskKey(item.api.url, method, item.api.params)
        if (!taskMap.has(key)) {
          taskMap.set(key, {
            key,
            url: item.api.url,
            method,
            params: item.api.params,
            labelKey: item.api.labelKey ?? 'label',
            valueKey: item.api.valueKey ?? 'value',
          })
        }
      }
      if (item.children) walk(item.children)
    }
  }

  walk(schema)
  return Array.from(taskMap.values())
}

/** 顺序执行请求队列 */
export async function executeQueue(tasks: QueueTask[]): Promise<Map<string, DictItem[]>> {
  const results = new Map<string, DictItem[]>()
  const http = getRequestInstance()

  for (const task of tasks) {
    // 查缓存
    const cached = getCachedOptions(task.url, task.params)
    if (cached) {
      results.set(task.key, cached)
      continue
    }

    try {
      const res: unknown = task.method === 'get'
        ? await http.get(task.url, { params: task.params })
        : await http.post(task.url, task.params)

      let rawList: Record<string, unknown>[] = []
      if (Array.isArray(res)) {
        rawList = res as Record<string, unknown>[]
      } else if (res && typeof res === 'object') {
        const obj = res as Record<string, unknown>
        rawList = (obj.data ?? obj.list ?? obj.rows ?? obj.items ?? []) as Record<string, unknown>[]
      }

      const options: DictItem[] = rawList.map((item) => ({
        label: String(item[task.labelKey] ?? ''),
        value: (item[task.valueKey] ?? item) as string | number | boolean,
      }))

      results.set(task.key, options)
      setCachedOptions(task.url, task.params, options)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '未知错误'
      logger.api(`${task.url} 加载失败:`, message)
      results.set(task.key, [])
    }
  }

  return results
}

/** 便捷方法：收集并执行 */
export async function processSchema(schema: FormSchemaItem[]) {
  const tasks = collectApiTasks(schema)
  if (tasks.length === 0) return
  return executeQueue(tasks)
}
