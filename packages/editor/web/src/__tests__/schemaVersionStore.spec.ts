/**
 * useSchemaVersionStore tests
 *
 * Covers:
 * - Initial state
 * - init: sets editId and loads versions
 * - loadVersions: fetches and stores version list
 * - selectForCompare / clearCompare: version selection
 * - executeCompare: loads two versions and computes diff
 * - rollbackToVersion: loads a version for rollback
 * - removeVersion: deletes a version and updates list
 * - exportVersion: returns JSON string for download
 * - reset: clears all state
 * - error handling
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSchemaVersionStore } from '@/stores/schemaVersion'
import type { VersionEntry, SchemaDetail } from '@/types/api'

// Mock apiClient
vi.mock('@/utils/apiClient', () => ({
  fetchVersions: vi.fn(),
  fetchVersion: vi.fn(),
  deleteVersion: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

import { fetchVersions, fetchVersion, deleteVersion } from '@/utils/apiClient'

const mockFetchVersions = vi.mocked(fetchVersions)
const mockFetchVersion = vi.mocked(fetchVersion)
const mockDeleteVersion = vi.mocked(deleteVersion)

function makeVersionEntry(overrides: Partial<VersionEntry> = {}): VersionEntry {
  return {
    id: 'schema-001',
    version: '20260101120000',
    createdAt: '2026-01-01T12:00:00Z',
    published: false,
    ...overrides,
  }
}

function makeSchemaDetail(overrides: Partial<SchemaDetail> = {}): SchemaDetail {
  return {
    id: 'schema-001',
    editId: 'edit-001',
    version: '20260101120000',
    name: 'Test Schema',
    type: 'form',
    status: 'draft',
    json: [
      { id: 'w1', type: 'input', name: 'Input-1', label: 'Name', position: { x: 0, y: 0, w: 200, h: 40 } },
    ],
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z',
    ...overrides,
  }
}

describe('useSchemaVersionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ------------------------------------------------------------------
  // Initial state
  // ------------------------------------------------------------------

  it('has correct initial state', () => {
    const store = useSchemaVersionStore()
    expect(store.versions).toEqual([])
    expect(store.currentVersion).toBe('')
    expect(store.editId).toBe('')
    expect(store.loading).toBe(false)
    expect(store.error).toBe('')
    expect(store.compareLeft).toBe('')
    expect(store.compareRight).toBe('')
    expect(store.diffResult).toBeNull()
    expect(store.hasVersions).toBe(false)
    expect(store.isEmpty).toBe(true)
    expect(store.canCompare).toBe(false)
  })

  // ------------------------------------------------------------------
  // init
  // ------------------------------------------------------------------

  it('init sets editId and loads versions', async () => {
    const store = useSchemaVersionStore()
    const versions = [makeVersionEntry(), makeVersionEntry({ version: '20260102120000' })]
    mockFetchVersions.mockResolvedValueOnce({ items: versions, total: 2 })

    await store.init('edit-001', '20260102120000')

    expect(store.editId).toBe('edit-001')
    expect(store.currentVersion).toBe('20260102120000')
    expect(store.versions).toEqual(versions)
    expect(store.total).toBe(2)
    expect(mockFetchVersions).toHaveBeenCalledWith('edit-001', 1, 20)
  })

  // ------------------------------------------------------------------
  // loadVersions
  // ------------------------------------------------------------------

  it('loadVersions fetches and stores version list', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    const versions = [makeVersionEntry()]
    mockFetchVersions.mockResolvedValueOnce({ items: versions, total: 1 })

    await store.loadVersions(1)

    expect(store.versions).toEqual(versions)
    expect(store.total).toBe(1)
    expect(store.page).toBe(1)
  })

  it('loadVersions handles errors', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    mockFetchVersions.mockRejectedValueOnce(new Error('Network error'))

    await store.loadVersions(1)

    expect(store.error).toBe('Network error')
    expect(store.versions).toEqual([])
  })

  it('loadVersions does nothing without editId', async () => {
    const store = useSchemaVersionStore()
    await store.loadVersions(1)
    expect(mockFetchVersions).not.toHaveBeenCalled()
  })

  // ------------------------------------------------------------------
  // selectForCompare / clearCompare
  // ------------------------------------------------------------------

  it('selectForCompare sets left and right versions', () => {
    const store = useSchemaVersionStore()
    store.selectForCompare('v1', 'left')
    store.selectForCompare('v2', 'right')
    expect(store.compareLeft).toBe('v1')
    expect(store.compareRight).toBe('v2')
    expect(store.canCompare).toBe(true)
  })

  it('clearCompare resets all compare state', () => {
    const store = useSchemaVersionStore()
    store.selectForCompare('v1', 'left')
    store.selectForCompare('v2', 'right')
    store.clearCompare()
    expect(store.compareLeft).toBe('')
    expect(store.compareRight).toBe('')
    expect(store.diffResult).toBeNull()
    expect(store.canCompare).toBe(false)
  })

  // ------------------------------------------------------------------
  // executeCompare
  // ------------------------------------------------------------------

  it('executeCompare loads two versions and computes diff', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    store.compareLeft = '20260101120000'
    store.compareRight = '20260102120000'

    const leftDetail = makeSchemaDetail({
      version: '20260101120000',
      json: [
        { id: 'w1', type: 'input', name: 'Input-1', label: 'Name', position: { x: 0, y: 0, w: 200, h: 40 } },
      ],
    })
    const rightDetail = makeSchemaDetail({
      version: '20260102120000',
      json: [
        { id: 'w1', type: 'input', name: 'Input-1', label: 'Full Name', position: { x: 0, y: 0, w: 200, h: 40 } },
        { id: 'w2', type: 'select', name: 'Select-1', label: 'City', position: { x: 0, y: 50, w: 200, h: 40 } },
      ],
    })

    mockFetchVersion
      .mockResolvedValueOnce(leftDetail)
      .mockResolvedValueOnce(rightDetail)

    const result = await store.executeCompare()

    expect(result).toBe(true)
    expect(store.leftDetail).toStrictEqual(leftDetail)
    expect(store.rightDetail).toStrictEqual(rightDetail)
    expect(store.diffResult).not.toBeNull()
    expect(store.diffResult!.added).toHaveLength(1)
    expect(store.diffResult!.added[0].id).toBe('w2')
    expect(store.diffResult!.modified).toHaveLength(1)
    expect(store.diffResult!.modified[0].id).toBe('w1')
  })

  it('executeCompare returns false without both versions', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    store.compareLeft = 'v1'
    // compareRight is empty

    const result = await store.executeCompare()
    expect(result).toBe(false)
  })

  it('executeCompare handles API errors', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    store.compareLeft = 'v1'
    store.compareRight = 'v2'
    mockFetchVersion.mockRejectedValueOnce(new Error('Not found'))

    const result = await store.executeCompare()

    expect(result).toBe(false)
    expect(store.error).toBe('Not found')
  })

  // ------------------------------------------------------------------
  // rollbackToVersion
  // ------------------------------------------------------------------

  it('rollbackToVersion loads and returns the version detail', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    const detail = makeSchemaDetail({ version: '20260101120000' })
    mockFetchVersion.mockResolvedValueOnce(detail)

    const result = await store.rollbackToVersion('20260101120000')

    expect(result).toBe(detail)
    expect(store.currentVersion).toBe('20260101120000')
  })

  it('rollbackToVersion returns null on error', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    mockFetchVersion.mockRejectedValueOnce(new Error('Failed'))

    const result = await store.rollbackToVersion('v1')

    expect(result).toBeNull()
    expect(store.error).toBe('Failed')
  })

  // ------------------------------------------------------------------
  // removeVersion
  // ------------------------------------------------------------------

  it('removeVersion deletes and removes from list', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    store.versions = [
      makeVersionEntry({ version: 'v1' }),
      makeVersionEntry({ version: 'v2' }),
    ]
    store.total = 2
    // deleteVersion returns void on success; mock resolves undefined
    mockDeleteVersion.mockResolvedValueOnce(undefined as never)

    const result = await store.removeVersion('v1')

    expect(result).toBe(true)
    expect(store.versions).toHaveLength(1)
    expect(store.versions[0].version).toBe('v2')
    expect(store.total).toBe(1)
  })

  it('removeVersion clears compare state if removed version was selected', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    store.versions = [
      makeVersionEntry({ version: 'v1' }),
      makeVersionEntry({ version: 'v2' }),
    ]
    store.total = 2
    store.selectForCompare('v1', 'left')
    store.selectForCompare('v2', 'right')
    mockDeleteVersion.mockResolvedValueOnce(undefined as never)

    await store.removeVersion('v1')

    expect(store.compareLeft).toBe('')
    expect(store.compareRight).toBe('v2')
  })

  // ------------------------------------------------------------------
  // exportVersion
  // ------------------------------------------------------------------

  it('exportVersion returns JSON string', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    const detail = makeSchemaDetail({
      json: [{ id: 'w1', type: 'input', name: 'Input-1', label: 'Name', position: { x: 0, y: 0, w: 200, h: 40 } }],
    })
    mockFetchVersion.mockResolvedValueOnce(detail)

    const result = await store.exportVersion('20260101120000')

    expect(result).not.toBeNull()
    const parsed = JSON.parse(result!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('w1')
  })

  it('exportVersion returns null on error', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    mockFetchVersion.mockRejectedValueOnce(new Error('Export failed'))

    const result = await store.exportVersion('v1')

    expect(result).toBeNull()
  })

  // ------------------------------------------------------------------
  // reset
  // ------------------------------------------------------------------

  it('reset clears all state', async () => {
    const store = useSchemaVersionStore()
    store.editId = 'edit-001'
    store.currentVersion = 'v1'
    store.versions = [makeVersionEntry()]
    store.total = 1
    store.selectForCompare('v1', 'left')

    store.reset()

    expect(store.editId).toBe('')
    expect(store.currentVersion).toBe('')
    expect(store.versions).toEqual([])
    expect(store.total).toBe(0)
    expect(store.compareLeft).toBe('')
    expect(store.compareRight).toBe('')
    expect(store.diffResult).toBeNull()
    expect(store.error).toBe('')
  })

  // ------------------------------------------------------------------
  // diffSummary / hasDiff
  // ------------------------------------------------------------------

  it('diffSummary returns empty string when no diff', () => {
    const store = useSchemaVersionStore()
    expect(store.diffSummary).toBe('')
    expect(store.hasDiff).toBe(false)
  })
})
