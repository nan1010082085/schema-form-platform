/**
 * useCache — Worker-backed L1/L2 cache composable
 *
 * Wraps a singleton Web Worker that handles:
 * - L1 in-memory Map (fast, session-scoped)
 * - L2 IndexedDB (persistent across refreshes, TTL-based)
 *
 * Falls back to an in-memory Map if the Worker cannot be created
 * (e.g. in SSR or environments without Worker support).
 */

import { useLogger } from './useLogger'

// ---- Types ----

interface CacheHitMessage {
  type: 'cache:hit'
  key: string
  data: unknown
}

interface CacheMissMessage {
  type: 'cache:miss'
  key: string
}

type CacheResponseMessage = CacheHitMessage | CacheMissMessage

// ---- Singleton Worker ----

let worker: Worker | null = null
let workerFailed = false

/** Pending get() promises keyed by cache key */
const pendingGets = new Map<string, { resolve: (value: unknown | null) => void }>()

/** Fallback in-memory cache for when Worker is unavailable */
const fallbackCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()

function getWorker(): Worker | null {
  if (workerFailed) return null
  if (worker) return worker

  try {
    worker = new Worker(new URL('../workers/cacheWorker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (event: MessageEvent<CacheResponseMessage>) => {
      const msg = event.data
      const pending = pendingGets.get(msg.key)
      if (!pending) return

      pendingGets.delete(msg.key)

      if (msg.type === 'cache:hit') {
        pending.resolve(msg.data)
      } else {
        pending.resolve(null)
      }
    }

    worker.onerror = (err) => {
      const logger = useLogger('Cache')
      logger.error('Worker error, falling back to in-memory cache:', err.message)
      workerFailed = true
      worker?.terminate()
      worker = null
      // Resolve all pending gets with null
      for (const [, pending] of pendingGets) {
        pending.resolve(null)
      }
      pendingGets.clear()
    }

    return worker
  } catch {
    workerFailed = true
    return null
  }
}

// ---- Hash ----

/**
 * djb2 string hash — produces a hex string suitable as a cache key.
 * Not cryptographic, just fast dedup.
 */
function djb2Hash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  // Convert to unsigned 32-bit hex
  return (hash >>> 0).toString(16).padStart(8, '0')
}

// ---- Composable ----

export function useCache() {
  /**
   * Generate a deterministic cache key from request parameters.
   */
  function hashKey(method: string, url: string, params?: Record<string, unknown>): string {
    const raw = `${method}:${url}:${JSON.stringify(params ?? {})}`
    return djb2Hash(raw)
  }

  /**
   * Get a value from cache. Returns null on miss.
   */
  function get<T>(key: string): Promise<T | null> {
    const w = getWorker()

    // Fallback path
    if (!w) {
      const entry = fallbackCache.get(key)
      if (!entry) return Promise.resolve(null)
      if (entry.ttl > 0 && Date.now() - entry.timestamp >= entry.ttl) {
        fallbackCache.delete(key)
        return Promise.resolve(null)
      }
      return Promise.resolve(entry.data as T)
    }

    // Worker path
    return new Promise<T | null>((resolve) => {
      pendingGets.set(key, { resolve: resolve as (value: unknown | null) => void })
      w.postMessage({ type: 'cache:get', key })
    })
  }

  /**
   * Store a value in cache.
   * @param ttl Time-to-live in milliseconds. Default 5 minutes. 0 = never expires.
   */
  function set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const w = getWorker()

    if (!w) {
      fallbackCache.set(key, { data, timestamp: Date.now(), ttl })
      return
    }

    w.postMessage({ type: 'cache:set', key, data, ttl })
  }

  /**
   * Delete a specific cache entry.
   */
  function del(key: string): void {
    const w = getWorker()

    if (!w) {
      fallbackCache.delete(key)
      return
    }

    w.postMessage({ type: 'cache:delete', key })
  }

  /**
   * Clear all cache entries (L1 + L2).
   */
  function clear(): void {
    fallbackCache.clear()

    const w = getWorker()
    if (w) {
      w.postMessage({ type: 'cache:clear' })
    }
  }

  return { hashKey, get, set, del, clear }
}
