/**
 * 选项内存缓存
 * 按 url:params JSON 作为 key 存储，支持 TTL 过期
 */
import type { DictItem } from '@/components/FormGrid/types'

interface CacheEntry {
  options: DictItem[]
  timestamp: number
  ttl: number // 0 = never expires
}

const cache = new Map<string, CacheEntry>()

function buildKey(url: string, params?: Record<string, unknown>): string {
  return `${url}:${JSON.stringify(params ?? {})}`
}

export function getCachedOptions(url: string, params?: Record<string, unknown>): DictItem[] | undefined {
  const key = buildKey(url, params)
  const entry = cache.get(key)
  if (!entry) return undefined

  // Check TTL expiry
  if (entry.ttl > 0) {
    const age = Date.now() - entry.timestamp
    if (age >= entry.ttl) {
      cache.delete(key)
      return undefined
    }
  }

  return entry.options
}

export function setCachedOptions(url: string, params: Record<string, unknown> | undefined, options: DictItem[], ttl = 0): void {
  cache.set(buildKey(url, params), {
    options,
    timestamp: Date.now(),
    ttl,
  })
}

export function clearOptionsCache(): void {
  cache.clear()
}
