/**
 * Cache Web Worker
 *
 * Handles L1 (in-memory Map) + L2 (IndexedDB) caching off the main thread.
 * Also manages a prefetch request queue.
 *
 * Message protocol — see README or useCache.ts for types.
 */

import { openDatabase, get, set, deleteEntry, clear, cleanExpired } from './indexedDb'

// ---- Types ----

interface CacheGetMessage {
  type: 'cache:get'
  key: string
}

interface CacheSetMessage {
  type: 'cache:set'
  key: string
  data: unknown
  ttl: number
}

interface CacheDeleteMessage {
  type: 'cache:delete'
  key: string
}

interface CacheClearMessage {
  type: 'cache:clear'
}

interface PrefetchTask {
  key: string
  url: string
  method: string
  params?: Record<string, unknown>
  labelKey: string
  valueKey: string
}

interface PrefetchAddMessage {
  type: 'prefetch:add'
  tasks: PrefetchTask[]
}

interface PrefetchFlushMessage {
  type: 'prefetch:flush'
}

type IncomingMessage =
  | CacheGetMessage
  | CacheSetMessage
  | CacheDeleteMessage
  | CacheClearMessage
  | PrefetchAddMessage
  | PrefetchFlushMessage

// ---- L1 in-memory cache ----

interface L1Entry {
  data: unknown
  timestamp: number
  ttl: number
}

const l1 = new Map<string, L1Entry>()

function l1Get(key: string): unknown | null {
  const entry = l1.get(key)
  if (!entry) return null
  if (entry.ttl > 0 && Date.now() - entry.timestamp >= entry.ttl) {
    l1.delete(key)
    return null
  }
  return entry.data
}

function l1Set(key: string, data: unknown, ttl: number): void {
  l1.set(key, { data, timestamp: Date.now(), ttl })
}

// ---- Prefetch queue ----

let prefetchQueue: PrefetchTask[] = []
let isPrefetching = false

// ---- Initialization ----

let dbReady = false

async function ensureDb(): Promise<void> {
  if (dbReady) return
  await openDatabase()
  dbReady = true
}

// ---- Periodic cleanup (every 5 minutes) ----

const CLEANUP_INTERVAL = 5 * 60 * 1000

setInterval(() => {
  if (!dbReady) return
  cleanExpired().catch(() => {})
}, CLEANUP_INTERVAL)

// ---- Message handler ----

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data

  try {
    await ensureDb()
  } catch {
    // If DB fails to open, L1 still works for cache:get
  }

  switch (msg.type) {
    case 'cache:get': {
      // L1 check
      const l1Data = l1Get(msg.key)
      if (l1Data !== null) {
        self.postMessage({ type: 'cache:hit', key: msg.key, data: l1Data })
        return
      }

      // L2 check
      try {
        const entry = await get(msg.key)
        if (entry) {
          // Promote to L1
          l1Set(msg.key, entry.data, entry.ttl)
          self.postMessage({ type: 'cache:hit', key: msg.key, data: entry.data })
        } else {
          self.postMessage({ type: 'cache:miss', key: msg.key })
        }
      } catch {
        self.postMessage({ type: 'cache:miss', key: msg.key })
      }
      break
    }

    case 'cache:set': {
      l1Set(msg.key, msg.data, msg.ttl)
      try {
        await set(msg.key, msg.data, msg.ttl)
      } catch {
        // L2 write failure is non-fatal; L1 is still warm
      }
      break
    }

    case 'cache:delete': {
      l1.delete(msg.key)
      try {
        await deleteEntry(msg.key)
      } catch {
        // ignore
      }
      break
    }

    case 'cache:clear': {
      l1.clear()
      try {
        await clear()
      } catch {
        // ignore
      }
      break
    }

    case 'prefetch:add': {
      // Deduplicate by key
      const existingKeys = new Set(prefetchQueue.map((t) => t.key))
      for (const task of msg.tasks) {
        if (!existingKeys.has(task.key)) {
          // Also skip if already in L1
          if (l1Get(task.key) !== null) continue
          prefetchQueue.push(task)
          existingKeys.add(task.key)
        }
      }
      break
    }

    case 'prefetch:flush': {
      if (isPrefetching) break
      if (prefetchQueue.length === 0) {
        self.postMessage({ type: 'prefetch:done' })
        break
      }

      isPrefetching = true
      const tasks = [...prefetchQueue]
      prefetchQueue = []

      for (const task of tasks) {
        // Skip if already cached
        if (l1Get(task.key) !== null) continue

        try {
          const url = task.method === 'get' && task.params
            ? `${task.url}?${new URLSearchParams(task.params as Record<string, string>)}`
            : task.url

          const response = await fetch(url, {
            method: task.method.toUpperCase(),
            headers: { 'Content-Type': 'application/json' },
            body: task.method !== 'get' && task.params ? JSON.stringify(task.params) : undefined,
          })

          if (!response.ok) {
            self.postMessage({ type: 'prefetch:error', key: task.key, error: `HTTP ${response.status}` })
            continue
          }

          const data = await response.json()

          // Cache the result (default 5 min TTL)
          const ttl = 5 * 60 * 1000
          l1Set(task.key, data, ttl)
          try {
            await set(task.key, data, ttl)
          } catch {
            // L2 failure is non-fatal
          }

          self.postMessage({ type: 'prefetch:result', key: task.key, data })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          self.postMessage({ type: 'prefetch:error', key: task.key, error: message })
        }
      }

      isPrefetching = false
      self.postMessage({ type: 'prefetch:done' })
      break
    }
  }
}
