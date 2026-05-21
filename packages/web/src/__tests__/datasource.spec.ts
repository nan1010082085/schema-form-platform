import { describe, it, expect } from 'vitest'
import { extractByPath, normalizeListResponse, getNestedValue } from '@/utils/responseNormalizer'

describe('extractByPath', () => {
  const data = {
    code: 200,
    data: {
      list: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      total: 2,
    },
  }

  it('returns data when path is empty', () => {
    expect(extractByPath(data, '')).toEqual(data)
  })

  it('supports simple dot path', () => {
    expect(extractByPath(data, 'data.list')).toEqual(data.data.list)
  })

  it('supports JSONPath with $', () => {
    const result = extractByPath(data, '$.data.list[*].name')
    expect(result).toEqual(['Alice', 'Bob'])
  })

  it('supports JSONPath array index', () => {
    const result = extractByPath(data, '$.data.list[0].name')
    expect(result).toBe('Alice')
  })

  it('returns undefined for invalid path', () => {
    expect(extractByPath(data, 'nonexistent.path')).toBeUndefined()
  })
})

describe('normalizeListResponse with JSONPath', () => {
  it('extracts list from nested structure via JSONPath', () => {
    const response = { result: { items: [{ id: 1 }] } }
    const result = normalizeListResponse(response, { dataPath: '$.result.items' })
    expect(result.data).toEqual([{ id: 1 }])
  })
})
