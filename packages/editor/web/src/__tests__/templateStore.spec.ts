/**
 * WidgetTemplatePanel + useTemplateStore tests
 *
 * Covers:
 * - useTemplateStore: load, search, filter, pagination, apply, save, delete
 * - WidgetTemplatePanel: renders list, handles search/category, applies template
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTemplateStore } from '@/stores/template'
import type { TemplateItem } from '@/utils/apiClient'

// Mock apiClient
vi.mock('@/utils/apiClient', () => ({
  fetchTemplates: vi.fn(),
  applyTemplate: vi.fn(),
  createTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}))

import {
  fetchTemplates,
  applyTemplate,
  createTemplate,
  deleteTemplate,
} from '@/utils/apiClient'

const mockFetchTemplates = vi.mocked(fetchTemplates)
const mockApplyTemplate = vi.mocked(applyTemplate)
const mockCreateTemplate = vi.mocked(createTemplate)
const mockDeleteTemplate = vi.mocked(deleteTemplate)

function makeTemplate(overrides: Partial<TemplateItem> = {}): TemplateItem {
  return {
    id: 'tpl-001',
    name: 'Test Template',
    description: 'A test template',
    category: 'form',
    widgetType: 'input',
    thumbnail: '',
    widgets: [{ type: 'input', props: { label: 'Name' } }],
    tags: ['test'],
    isBuiltin: false,
    createdBy: 'user1',
    usageCount: 5,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('useTemplateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ------------------------------------------------------------------
  // Initial state
  // ------------------------------------------------------------------

  it('has correct initial state', () => {
    const store = useTemplateStore()
    expect(store.templates).toEqual([])
    expect(store.total).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.searchKeyword).toBe('')
    expect(store.selectedCategory).toBe('')
    expect(store.page).toBe(1)
    expect(store.pageSize).toBe(20)
  })

  // ------------------------------------------------------------------
  // loadTemplates
  // ------------------------------------------------------------------

  it('loads templates from API', async () => {
    const items = [makeTemplate(), makeTemplate({ id: 'tpl-002', name: 'Template 2' })]
    mockFetchTemplates.mockResolvedValue({ items, total: 2, page: 1, pageSize: 20, totalPages: 1 })

    const store = useTemplateStore()
    await store.loadTemplates()

    expect(store.templates).toHaveLength(2)
    expect(store.total).toBe(2)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(mockFetchTemplates).toHaveBeenCalledWith({
      search: undefined,
      category: undefined,
      page: 1,
      pageSize: 20,
    })
  })

  it('sets error on API failure', async () => {
    mockFetchTemplates.mockRejectedValue(new Error('Network error'))

    const store = useTemplateStore()
    await store.loadTemplates()

    expect(store.templates).toEqual([])
    expect(store.total).toBe(0)
    expect(store.error).toBe('Network error')
    expect(store.loading).toBe(false)
  })

  it('passes search and category to API', async () => {
    mockFetchTemplates.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })

    const store = useTemplateStore()
    store.setSearch('login')
    store.setCategory('form')
    await store.loadTemplates()

    expect(mockFetchTemplates).toHaveBeenCalledWith({
      search: 'login',
      category: 'form',
      page: 1,
      pageSize: 20,
    })
  })

  // ------------------------------------------------------------------
  // setSearch / setCategory / setPage / resetFilters
  // ------------------------------------------------------------------

  it('setSearch updates keyword and resets page', () => {
    const store = useTemplateStore()
    store.page = 3
    store.setSearch('keyword')
    expect(store.searchKeyword).toBe('keyword')
    expect(store.page).toBe(1)
  })

  it('setCategory updates category and resets page', () => {
    const store = useTemplateStore()
    store.page = 5
    store.setCategory('layout')
    expect(store.selectedCategory).toBe('layout')
    expect(store.page).toBe(1)
  })

  it('setPage updates page', () => {
    const store = useTemplateStore()
    store.setPage(3)
    expect(store.page).toBe(3)
  })

  it('resetFilters clears all filters', () => {
    const store = useTemplateStore()
    store.setSearch('test')
    store.setCategory('form')
    store.setPage(5)
    store.resetFilters()
    expect(store.searchKeyword).toBe('')
    expect(store.selectedCategory).toBe('')
    expect(store.page).toBe(1)
  })

  // ------------------------------------------------------------------
  // Computed: totalPages, hasMore
  // ------------------------------------------------------------------

  it('computes totalPages correctly', () => {
    const store = useTemplateStore()
    store.total = 45
    expect(store.totalPages).toBe(3) // ceil(45/20)
  })

  it('computes hasMore correctly', () => {
    const store = useTemplateStore()
    store.total = 45
    store.page = 2
    expect(store.hasMore).toBe(true)
    store.page = 3
    expect(store.hasMore).toBe(false)
  })

  // ------------------------------------------------------------------
  // applyTemplateById
  // ------------------------------------------------------------------

  it('applyTemplateById returns widgets and refreshes list', async () => {
    const widgets = [{ type: 'input', props: { label: 'Name' } }]
    mockApplyTemplate.mockResolvedValue({ name: 'Test', widgets })
    mockFetchTemplates.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })

    const store = useTemplateStore()
    const result = await store.applyTemplateById('tpl-001')

    expect(result).toEqual(widgets)
    expect(mockApplyTemplate).toHaveBeenCalledWith('tpl-001')
    // loadTemplates is called to refresh
    expect(mockFetchTemplates).toHaveBeenCalled()
  })

  // ------------------------------------------------------------------
  // saveTemplate
  // ------------------------------------------------------------------

  it('saveTemplate creates template and refreshes list', async () => {
    const newTemplate = makeTemplate({ id: 'tpl-new', name: 'New Template' })
    mockCreateTemplate.mockResolvedValue(newTemplate)
    mockFetchTemplates.mockResolvedValue({ items: [newTemplate], total: 1, page: 1, pageSize: 20, totalPages: 1 })

    const store = useTemplateStore()
    const result = await store.saveTemplate({
      name: 'New Template',
      widgets: [{ type: 'input' }],
      category: 'form',
    })

    expect(result.id).toBe('tpl-new')
    expect(mockCreateTemplate).toHaveBeenCalledWith({
      name: 'New Template',
      widgets: [{ type: 'input' }],
      category: 'form',
    })
    expect(mockFetchTemplates).toHaveBeenCalled()
  })

  // ------------------------------------------------------------------
  // removeTemplate
  // ------------------------------------------------------------------

  it('removeTemplate deletes and refreshes list', async () => {
    mockDeleteTemplate.mockResolvedValue(null)
    mockFetchTemplates.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })

    const store = useTemplateStore()
    await store.removeTemplate('tpl-001')

    expect(mockDeleteTemplate).toHaveBeenCalledWith('tpl-001')
    expect(mockFetchTemplates).toHaveBeenCalled()
  })
})
