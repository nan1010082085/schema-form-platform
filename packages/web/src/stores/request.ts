// @ts-nocheck
/**
 * useRequestStore — 请求队列与缓存管理
 *
 * 统一管理：
 * 1. 正在进行的请求（防重 / 取消）
 * 2. 响应缓存（带 TTL，跨组件共享）
 * 3. 预取队列（批量加载 schema 树中的 API 选项）
 *
 * 设计原则：
 * - 基于请求 key（method:url:params）去重，同一请求不重复发送
 * - 缓存支持 TTL 过期，0 = 永不过期（与 optionsCache.ts 行为一致）
 * - 预取队列按序执行，失败不阻塞后续任务
 * - 与现有的 requestQueue.ts / optionsCache.ts 功能兼容，
 *   可作为集中式替代方案使用
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getRequestInstance } from '@/utils/request'
import type { FormSchemaItem, DictItem, SchemaApiConfig } from '@/components/FormGrid/types'
import type { CacheEntry, PrefetchTask } from '@/types/api'

/** 默认 TTL：5 分钟 */
const DEFAULT_TTL = 5 * 60 * 1000

export const useRequestStore = defineStore('request', () => {
  // ================================================================
  // 状态
  // ================================================================

  /**
   * 正在进行的请求映射。
   * key = `method:url:JSON(params)` → AbortController
   */
  const pendingRequests = ref(new Map<string, AbortController>())

  /**
   * 响应缓存。
   * key = `url:JSON(params)` → CacheEntry
   */
  const requestCache = ref(new Map<string, CacheEntry>())

  /**
   * 预取队列 — 从 schema 树收集的待加载 API 任务。
   */
  const prefetchQueue = ref<PrefetchTask[]>([])

  /**
   * 预取队列处理状态。
   */
  const isPrefetching = ref(false)

  // ================================================================
  // 计算属性
  // ================================================================

  /** 当前正在进行的请求数量 */
  const pendingCount = computed(() => pendingRequests.value.size)

  /** 缓存条目数量 */
  const cacheSize = computed(() => requestCache.value.size)

  /** 预取队列长度 */
  const queueLength = computed(() => prefetchQueue.value.length)

  // ================================================================
  // 内部工具
  // ================================================================

  /**
   * 生成请求 key。
   */
  function requestKey(method: string, url: string, params?: Record<string, unknown>): string {
    return `${method}:${url}:${JSON.stringify(params ?? {})}`
  }

  /**
   * 生成缓存 key。
   */
  function cacheKey(url: string, params?: Record<string, unknown>): string {
    return `${url}:${JSON.stringify(params ?? {})}`
  }

  /**
   * 构建预取任务 key。
   */
  function prefetchTaskKey(url: string, method: string, params?: Record<string, unknown>): string {
    return `${method}:${url}:${JSON.stringify(params ?? {})}`
  }

  // ================================================================
  // 请求管理
  // ================================================================

  /**
   * 检查是否有相同请求正在进行中。
   */
  function isPending(method: string, url: string, params?: Record<string, unknown>): boolean {
    return pendingRequests.value.has(requestKey(method, url, params))
  }

  /**
   * 标记一个请求为"进行中"。
   *
   * @returns AbortController 供调用方在超时或取消时使用
   */
  function trackRequest(
    method: string,
    url: string,
    params?: Record<string, unknown>,
  ): AbortController {
    const key = requestKey(method, url, params)
    // 若已有同名请求在进行中，先取消旧的
    cancelRequest(method, url, params)
    const controller = new AbortController()
    pendingRequests.value = new Map(pendingRequests.value).set(key, controller)
    return controller
  }

  /**
   * 移除请求跟踪（请求完成或失败后调用）。
   */
  function untrackRequest(
    method: string,
    url: string,
    params?: Record<string, unknown>,
  ): void {
    const next = new Map(pendingRequests.value)
    next.delete(requestKey(method, url, params))
    pendingRequests.value = next
  }

  /**
   * 取消一个正在进行的请求。
   */
  function cancelRequest(
    method: string,
    url: string,
    params?: Record<string, unknown>,
  ): boolean {
    const key = requestKey(method, url, params)
    const controller = pendingRequests.value.get(key)
    if (controller) {
      controller.abort()
      const next = new Map(pendingRequests.value)
      next.delete(key)
      pendingRequests.value = next
      return true
    }
    return false
  }

  /**
   * 取消所有正在进行的请求。
   */
  function cancelAllRequests(): void {
    for (const controller of pendingRequests.value.values()) {
      controller.abort()
    }
    pendingRequests.value = new Map()
  }

  // ================================================================
  // 缓存管理
  // ================================================================

  /**
   * 从缓存获取数据。
   *
   * @returns 缓存的数据，若不存在或已过期则返回 undefined
   */
  function cacheGet<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
  ): T | undefined {
    const key = cacheKey(url, params)
    const entry = requestCache.value.get(key)
    if (!entry) return undefined

    // 检查 TTL
    if (entry.ttl > 0) {
      const age = Date.now() - entry.timestamp
      if (age >= entry.ttl) {
        // 过期，删除条目
        const next = new Map(requestCache.value)
        next.delete(key)
        requestCache.value = next
        return undefined
      }
    }

    return entry.data as T
  }

  /**
   * 写入缓存。
   *
   * @param url  - 请求 URL
   * @param params - 请求参数
   * @param data - 要缓存的数据
   * @param ttl  - TTL 毫秒数，默认 5 分钟，设为 0 表示永不过期
   */
  function cacheSet<T = unknown>(
    url: string,
    params: Record<string, unknown> | undefined,
    data: T,
    ttl: number = DEFAULT_TTL,
  ): void {
    const key = cacheKey(url, params)
    const next = new Map(requestCache.value)
    next.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
    requestCache.value = next
  }

  /** 删除指定缓存条目 */
  function cacheDelete(url: string, params?: Record<string, unknown>): boolean {
    const key = cacheKey(url, params)
    if (requestCache.value.has(key)) {
      const next = new Map(requestCache.value)
      next.delete(key)
      requestCache.value = next
      return true
    }
    return false
  }

  /** 清空所有缓存 */
  function cacheClear(): void {
    requestCache.value = new Map()
  }

  // ================================================================
  // 预取队列
  // ================================================================

  /**
   * 从 FormSchemaItem[] 树中收集 API 任务并追加到预取队列。
   *
   * 与 requestQueue.ts 的 collectApiTasks 功能等价。
   */
  function collectPrefetchTasks(schema: FormSchemaItem[]): void {
    const taskMap = new Map<string, PrefetchTask>()

    function walk(items: FormSchemaItem[]): void {
      for (const item of items) {
        const api: SchemaApiConfig | undefined = item.api
        if (api?.url && !api.dictCode) {
          const method = api.method ?? 'get'
          const key = prefetchTaskKey(api.url, method, api.params)
          if (!taskMap.has(key)) {
            taskMap.set(key, {
              key,
              url: api.url,
              method,
              params: api.params,
              labelKey: api.labelKey ?? 'label',
              valueKey: api.valueKey ?? 'value',
            })
          }
        }
        if (item.children) walk(item.children)
      }
    }

    walk(schema)

    const newTasks = Array.from(taskMap.values())
    // 过滤掉已在队列中或已缓存的任务
    const filtered = newTasks.filter((task) => {
      const cKey = cacheKey(task.url, task.params)
      return !requestCache.value.has(cKey) && !prefetchQueue.value.some(
        (t) => t.key === task.key,
      )
    })

    if (filtered.length > 0) {
      prefetchQueue.value = [...prefetchQueue.value, ...filtered]
    }
  }

  /**
   * 添加单个预取任务到队列末尾。
   */
  function enqueuePrefetch(task: PrefetchTask): void {
    // 去重
    if (prefetchQueue.value.some((t) => t.key === task.key)) return
    if (cacheGet(task.url, task.params) !== undefined) return
    prefetchQueue.value = [...prefetchQueue.value, task]
  }

  /**
   * 从队列头部取出一个任务。
   */
  function dequeuePrefetch(): PrefetchTask | undefined {
    const [head, ...rest] = prefetchQueue.value
    if (!head) return undefined
    prefetchQueue.value = rest
    return head
  }

  /**
   * 清空预取队列。
   */
  function clearPrefetchQueue(): void {
    prefetchQueue.value = []
  }

  /**
   * 执行预取队列中的所有任务。
   *
   * 按序执行，失败任务不会阻塞后续任务。
   * 每个任务执行完成后自动缓存结果。
   */
  async function flushPrefetchQueue(): Promise<Map<string, DictItem[]>> {
    if (prefetchQueue.value.length === 0) return new Map()

    isPrefetching.value = true
    const results = new Map<string, DictItem[]>()
    const http = getRequestInstance()

    // 一次性获取所有任务（后续 dequeue 逐个处理）
    const tasks = [...prefetchQueue.value]
    prefetchQueue.value = []

    for (const task of tasks) {
      // 查缓存
      const cached = cacheGet<DictItem[]>(task.url, task.params)
      if (cached) {
        results.set(task.key, cached)
        continue
      }

      try {
        // 若已有相同请求在进行中，跳过
        if (isPending(task.method, task.url, task.params)) continue

        trackRequest(task.method, task.url, task.params)

        const res: unknown =
          task.method === 'get'
            ? await http.get(task.url, { params: task.params })
            : await http.post(task.url, task.params)

        untrackRequest(task.method, task.url, task.params)

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
        cacheSet(task.url, task.params, options)
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error(`[RequestStore] Prefetch failed for ${task.url}:`, message)
        untrackRequest(task.method, task.url, task.params)
        results.set(task.key, [])
      }
    }

    isPrefetching.value = false
    return results
  }

  /**
   * 便捷方法：收集 schema 树中的 API 任务并执行预取。
   *
   * @param schema - FormSchemaItem 树
   * @returns 预取结果 Map（key → DictItem[]）
   */
  async function prefetchSchemaOptions(
    schema: FormSchemaItem[],
  ): Promise<Map<string, DictItem[]>> {
    collectPrefetchTasks(schema)
    return flushPrefetchQueue()
  }

  return {
    // 状态
    pendingRequests,
    requestCache,
    prefetchQueue,
    isPrefetching,
    // 计算属性
    pendingCount,
    cacheSize,
    queueLength,
    // 请求管理
    isPending,
    trackRequest,
    untrackRequest,
    cancelRequest,
    cancelAllRequests,
    // 缓存
    cacheGet,
    cacheSet,
    cacheDelete,
    cacheClear,
    // 预取队列
    collectPrefetchTasks,
    enqueuePrefetch,
    dequeuePrefetch,
    clearPrefetchQueue,
    flushPrefetchQueue,
    prefetchSchemaOptions,
  }
})
