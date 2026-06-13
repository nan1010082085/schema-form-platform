/**
 * IndexedDB wrapper for persistent L2 cache
 *
 * Runs inside the Web Worker context.
 * DB: schema-form-cache / Store: responses
 */

const DB_NAME = 'schema-form-cache'
const STORE_NAME = 'responses'
const DB_VERSION = 1

interface CacheEntry {
  key: string
  data: unknown
  timestamp: number
  ttl: number
}

let dbInstance: IDBDatabase | null = null

export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onerror = () => {
      reject(new Error(`IndexedDB open failed: ${request.error?.message}`))
    }
  })
}

export async function get(key: string): Promise<CacheEntry | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(key)

    request.onsuccess = () => {
      const entry = request.result as CacheEntry | undefined
      if (!entry) {
        resolve(null)
        return
      }

      // Check TTL expiry
      if (entry.ttl > 0 && Date.now() - entry.timestamp >= entry.ttl) {
        // Expired — delete asynchronously, return null
        deleteEntry(key)
        resolve(null)
        return
      }

      resolve(entry)
    }

    request.onerror = () => {
      reject(new Error(`IndexedDB get failed: ${request.error?.message}`))
    }
  })
}

export async function set(key: string, data: unknown, ttl: number): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const entry: CacheEntry = { key, data, timestamp: Date.now(), ttl }
    const request = store.put(entry)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`IndexedDB set failed: ${request.error?.message}`))
  })
}

export async function deleteEntry(key: string): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`IndexedDB delete failed: ${request.error?.message}`))
  })
}

export async function clear(): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`IndexedDB clear failed: ${request.error?.message}`))
  })
}

/**
 * Remove all expired entries from the store.
 * Returns the count of deleted entries.
 */
export async function cleanExpired(): Promise<number> {
  const db = await openDatabase()
  const now = Date.now()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.openCursor()
    let deleted = 0

    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve(deleted)
        return
      }

      const entry = cursor.value as CacheEntry
      if (entry.ttl > 0 && now - entry.timestamp >= entry.ttl) {
        cursor.delete()
        deleted++
      }

      cursor.continue()
    }

    request.onerror = () => {
      reject(new Error(`IndexedDB cleanExpired failed: ${request.error?.message}`))
    }
  })
}
