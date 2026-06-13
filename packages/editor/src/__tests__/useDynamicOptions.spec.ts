import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeListResponse, getNestedValue } from '@/utils/responseNormalizer'

describe('getNestedValue', () => {
  it('retrieves a top-level key', () => {
    const obj = { data: [1, 2, 3] }
    expect(getNestedValue(obj, 'data')).toEqual([1, 2, 3])
  })

  it('traverses dot-notation path', () => {
    const obj = { result: { records: [{ id: 1 }] } }
    expect(getNestedValue(obj, 'result.records')).toEqual([{ id: 1 }])
  })

  it('returns undefined for missing path', () => {
    const obj = { data: [] }
    expect(getNestedValue(obj, 'missing.path')).toBeUndefined()
  })

  it('returns undefined for null/undefined input', () => {
    expect(getNestedValue(null, 'data')).toBeUndefined()
    expect(getNestedValue(undefined, 'data')).toBeUndefined()
  })

  it('handles intermediate null values', () => {
    const obj = { a: { b: null } }
    expect(getNestedValue(obj, 'a.b.c')).toBeUndefined()
  })
})

describe('normalizeListResponse', () => {
  it('handles bare array response', () => {
    const { data, total } = normalizeListResponse([{ id: 1 }, { id: 2 }])
    expect(data).toEqual([{ id: 1 }, { id: 2 }])
    expect(total).toBe(0)
  })

  it('extracts from data wrapper key (default fallback)', () => {
    const { data } = normalizeListResponse({ data: [{ name: 'Alice' }] })
    expect(data).toEqual([{ name: 'Alice' }])
  })

  it('extracts from list wrapper key (default fallback)', () => {
    const { data } = normalizeListResponse({ list: [{ name: 'Bob' }] })
    expect(data).toEqual([{ name: 'Bob' }])
  })

  it('extracts from rows wrapper key (default fallback)', () => {
    const { data } = normalizeListResponse({ rows: [{ name: 'C' }] })
    expect(data).toEqual([{ name: 'C' }])
  })

  it('extracts from items wrapper key (default fallback)', () => {
    const { data } = normalizeListResponse({ items: [{ name: 'D' }] })
    expect(data).toEqual([{ name: 'D' }])
  })

  it('extracts from records wrapper key (default fallback)', () => {
    const { data } = normalizeListResponse({ records: [{ name: 'E' }] })
    expect(data).toEqual([{ name: 'E' }])
  })

  it('extracts using configured dataPath with dot-notation', () => {
    const res = { result: { records: [{ id: 1 }, { id: 2 }] } }
    const { data } = normalizeListResponse(res, { dataPath: 'result.records' })
    expect(data).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('extracts using deep dataPath', () => {
    const res = { payload: { body: { items: [{ x: 1 }] } } }
    const { data } = normalizeListResponse(res, { dataPath: 'payload.body.items' })
    expect(data).toEqual([{ x: 1 }])
  })

  it('returns empty array when dataPath does not match', () => {
    const res = { data: [{ x: 1 }] }
    const { data } = normalizeListResponse(res, { dataPath: 'wrong.path' })
    expect(data).toEqual([])
  })

  it('returns empty array for null/undefined response', () => {
    expect(normalizeListResponse(null).data).toEqual([])
    expect(normalizeListResponse(undefined).data).toEqual([])
  })

  it('returns empty array for empty object response', () => {
    const { data } = normalizeListResponse({})
    expect(data).toEqual([])
  })

  it('extracts total when totalPath is configured', () => {
    const res = { data: [{ id: 1 }], pageInfo: { totalCount: 42 } }
    const { data, total } = normalizeListResponse(res, { totalPath: 'pageInfo.totalCount' })
    expect(data).toHaveLength(1)
    expect(total).toBe(42)
  })

  it('returns zero total when totalPath does not match', () => {
    const res = { data: [{ id: 1 }] }
    const { total } = normalizeListResponse(res, { totalPath: 'nonexistent' })
    expect(total).toBe(0)
  })

  it('dataPath takes precedence over default fallback', () => {
    // Both data and result.records exist; dataPath should pick result.records
    const res = { data: [{ a: 1 }], result: { records: [{ b: 2 }] } }
    const { data } = normalizeListResponse(res, { dataPath: 'result.records' })
    expect(data).toEqual([{ b: 2 }])
  })
})

// ---- SP17-004: Cache TTL tests ----
import { getCachedOptions, setCachedOptions, clearOptionsCache } from '@/utils/optionsCache'

describe('optionsCache TTL', () => {
  beforeEach(() => {
    clearOptionsCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns cached options when not expired', () => {
    setCachedOptions('/api/test', {}, [{ label: 'A', value: 'a' }], 5000)
    const result = getCachedOptions('/api/test', {})
    expect(result).toEqual([{ label: 'A', value: 'a' }])
  })

  it('returns undefined when TTL expired', () => {
    setCachedOptions('/api/test', {}, [{ label: 'A', value: 'a' }], 5000)
    vi.advanceTimersByTime(6000)
    const result = getCachedOptions('/api/test', {})
    expect(result).toBeUndefined()
  })

  it('ttl=0 means never expires (default)', () => {
    setCachedOptions('/api/test', {}, [{ label: 'A', value: 'a' }], 0)
    vi.advanceTimersByTime(999999999)
    const result = getCachedOptions('/api/test', {})
    expect(result).toEqual([{ label: 'A', value: 'a' }])
  })

  it('ttl=0 by default in setCachedOptions', () => {
    setCachedOptions('/api/test', {}, [{ label: 'B', value: 'b' }])
    vi.advanceTimersByTime(999999999)
    const result = getCachedOptions('/api/test', {})
    expect(result).toEqual([{ label: 'B', value: 'b' }])
  })
})

// ---- SP17-001: childrenKey tree tests ----
describe('normalizeListResponse keeps tree structure intact', () => {
  it('preserves nested children in raw response for consumer to process', () => {
    const res = {
      data: [
        { id: 1, name: 'Root', children: [{ id: 2, name: 'Child 1' }, { id: 3, name: 'Child 2' }] },
      ],
    }
    const { data } = normalizeListResponse(res)
    expect(data).toHaveLength(1)
    expect(data[0].children).toBeDefined()
    expect(Array.isArray(data[0].children)).toBe(true)
  })
})
