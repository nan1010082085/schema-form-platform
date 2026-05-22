/**
 * Shared response normalization utilities.
 *
 * Consolidates duplicated response-parsing logic from:
 *   useDynamicOptions.ts, useListData.ts, ApiConfig.vue, FgSearchList.vue
 */
import { JSONPath } from 'jsonpath-plus'
import { useLogger } from '@/composables/useLogger'

const logger = useLogger('ResponseNormalizer')

/** Traverse object by dot-separated path (e.g. "result.records" traverses { result: { records: [...] } }) */
export function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

/**
 * Extract a value from an object by path expression.
 *
 * - Empty string → returns data as-is
 * - Starts with `$` → treated as JSONPath expression (e.g. `$.data.list[*].name`)
 * - Otherwise → dot-separated path via getNestedValue
 */
export function extractByPath(data: unknown, path: string): unknown {
  if (!path) return data
  if (path.startsWith('$')) {
    try {
      return (JSONPath as unknown as (opts: Record<string, unknown>) => unknown)({ path, json: data, wrap: false })
    } catch {
      return undefined
    }
  }
  return getNestedValue(data, path)
}

/**
 * Extract a flat array from an arbitrary API response.
 *
 * Resolution order:
 * 1. If response IS an array → use it directly
 * 2. If `dataPath` is set → use getNestedValue(response, dataPath)
 * 3. Otherwise try common wrapper keys: data → list → rows → items → records
 * 4. Fallback: the raw response object (will likely produce empty array)
 *
 * Returns the extracted array and the total count (0 if unavailable).
 */
export function normalizeListResponse(
  res: unknown,
  options?: { dataPath?: string; totalPath?: string },
): { data: Record<string, unknown>[]; total: number } {
  let data: Record<string, unknown>[] = []
  let total = 0

  // 1. Response is already an array
  if (Array.isArray(res)) {
    data = res as Record<string, unknown>[]
  } else if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>

    // 2. Use configured dataPath (supports both dot-path and JSONPath)
    if (options?.dataPath) {
      const nested = extractByPath(obj, options.dataPath)
      data = Array.isArray(nested) ? (nested as Record<string, unknown>[]) : []
    } else {
      // 3. Fallback: try common wrapper keys
      data = (obj.data ?? obj.list ?? obj.rows ?? obj.items ?? obj.records) as Record<string, unknown>[] | undefined ?? []
      if (!Array.isArray(data)) data = []

      if (data.length === 0 && !(obj.data || obj.list || obj.rows || obj.items || obj.records)) {
        logger.api('Could not find a data array in the response. Set `dataPath` to specify the exact path.', { responseKeys: Object.keys(obj) })
      }
    }

    // Extract total if totalPath is configured
    if (options?.totalPath) {
      const totalVal = getNestedValue(obj, options.totalPath)
      total = typeof totalVal === 'number' ? totalVal : 0
    }
  }

  return { data, total }
}
