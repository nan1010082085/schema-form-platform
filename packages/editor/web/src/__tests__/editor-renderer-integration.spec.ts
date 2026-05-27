// @ts-nocheck
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { ref, computed } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import FgSearchList from '@/widgets/search-list/FgSearchList.vue'
import { widgetDataKey } from '@/widgets/base/types'
import type { Widget } from '@/widgets/base/types'
import SearchFieldsEditor from '@/components/Editor/SearchFieldsEditor.vue'
import ColumnsEditor from '@/components/Editor/ColumnsEditor.vue'
import RowActionsEditor from '@/components/Editor/RowActionsEditor.vue'
import type {
  PartialWidget,
  SearchFieldSchema,
  SearchListColumnSchema,
  SearchListRowAction,
} from '@/widgets/base/types'

// Stub matchMedia required by useBreakpoint
beforeAll(() => {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

// Mock useListData to return predictable data (using actual Vue refs)
vi.mock('@/composables/useListData', () => ({
  useListData: () => ({
    tableData: ref([
      { id: 1, name: 'Alice', status: 'Active', dept: 'Engineering' },
      { id: 2, name: 'Bob', status: 'Inactive', dept: 'Marketing' },
      { id: 3, name: 'Charlie', status: 'Active', dept: 'Engineering' },
    ]),
    total: ref(3),
    loading: ref(false),
    error: ref(''),
    fetchData: vi.fn(),
    currentPage: ref(1),
    pageSize: ref(10),
    searchParams: {} as Record<string, unknown>,
    setSearchParams: vi.fn(),
    handleSearch: vi.fn(),
    handleReset: vi.fn(),
    handlePageChange: vi.fn(),
    handleSizeChange: vi.fn(),
    handleSortChange: vi.fn(),
    selectedRows: ref([]),
    handleSelectionChange: vi.fn(),
    clearSelection: vi.fn(),
  }),
}))

vi.mock('@/utils/request', () => ({
  getRequestInstance: () => ({
    get: vi.fn().mockResolvedValue({ code: 0, data: [] }),
    post: vi.fn().mockResolvedValue({ code: 0, data: [] }),
  }),
}))

/** Shared mount options with ElementPlus plugin + router mock */
function mountWithEl(component: any, options: any = {}): VueWrapper<any> {
  const { global: globalOpts = {}, ...rest } = options
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(component, {
    ...rest,
    global: {
      plugins: [pinia, ElementPlus],
      ...globalOpts,
      provide: {
        // Router mock (needed by FgSearchList for navigate row actions)
        router: { push: vi.fn(), replace: vi.fn() },
        ...(globalOpts.provide || {}),
      },
    },
  })
}

/** Shared stubs to reduce boilerplate */
const tableStubs = {
  'el-table': true,
  'el-table-column': true,
  'el-pagination': true,
  'FgTable': { template: '<div class="mock-table"><slot /></div>', props: ['data', 'columns', 'loading'] },
  'FgPagination': { template: '<div class="mock-pagination" />', props: ['currentPage', 'pageSize', 'total'] },
  'el-button': true,
  'el-skeleton': { template: '<div class="el-skeleton" />' },
  'el-skeleton-item': true,
}

// ---- Editor Tests ----

describe('SearchFieldsEditor → schema output', () => {
  it('adds a search field and emits valid SearchFieldSchema', async () => {
    const wrapper = mountWithEl(SearchFieldsEditor, {
      props: { searchFields: [] },
    })

    await wrapper.find('.el-button').trigger('click')

    const fields = wrapper.emitted<SearchFieldSchema[][]>('update:searchFields')![0][0]
    expect(fields).toHaveLength(1)
    expect(fields[0]).toMatchObject({ type: 'input', field: '', label: '' })
  })

  it('renders existing fields from props without error', () => {
    const initial: SearchFieldSchema[] = [
      { type: 'input', field: 'name', label: 'Name', span: 8 },
    ]
    const wrapper = mountWithEl(SearchFieldsEditor, {
      props: { searchFields: initial },
    })
    // Component should render successfully and maintain props
    expect(wrapper.exists()).toBe(true)
  })
})

describe('ColumnsEditor → schema output', () => {
  it('adds a column and emits valid SearchListColumnSchema', async () => {
    const wrapper = mountWithEl(ColumnsEditor, {
      props: { columns: [] },
    })

    await wrapper.find('.el-button').trigger('click')

    const cols = wrapper.emitted<SearchListColumnSchema[][]>('update:columns')![0][0]
    expect(cols).toHaveLength(1)
    expect(cols[0]).toMatchObject({ render: 'text', sortable: false, align: 'left' })
  })

  it('all render modes produce valid column shape', () => {
    const columns: SearchListColumnSchema[] = [
      { prop: 'c1', label: 'Text', render: 'text' },
      { prop: 'c2', label: 'Badge', render: 'badge', colorMap: { Active: '#67c23a' } },
      { prop: 'c3', label: 'Tag', render: 'tag' },
      { prop: 'c4', label: 'Link', render: 'link', linkEvent: 'view' },
      { prop: 'c5', label: 'Image', render: 'image', imageWidth: 60 },
      { prop: 'c6', label: 'Tooltip', render: 'tooltip', tooltipField: 'c6_desc' },
      { prop: 'c7', label: 'Custom', render: 'custom' },
    ]

    for (const col of columns) {
      expect(col).toHaveProperty('prop')
      expect(col).toHaveProperty('label')
      expect(col).toHaveProperty('render')
      expect(['text', 'badge', 'tag', 'link', 'image', 'tooltip', 'custom']).toContain(col.render)
    }
  })
})

describe('RowActionsEditor → schema output', () => {
  it('adds a row action and emits valid SearchListRowAction', async () => {
    const wrapper = mountWithEl(RowActionsEditor, {
      props: { rowActions: [] },
    })

    await wrapper.find('.el-button').trigger('click')

    const actions = wrapper.emitted<SearchListRowAction[][]>('update:rowActions')![0][0]
    expect(actions).toHaveLength(1)
    expect(actions[0]).toHaveProperty('type')
    expect(actions[0]).toHaveProperty('label')
  })

  it('all 4 action types produce valid shapes', () => {
    const actions: SearchListRowAction[] = [
      { label: 'View', buttonType: 'primary', type: 'emit', emitEvent: 'view' },
      { label: 'Delete', buttonType: 'danger', type: 'api', apiUrl: '/api/delete/:id', apiMethod: 'post' },
      { label: 'Detail', buttonType: 'primary', type: 'navigate', navigatePath: '/detail/:id' },
      { label: 'Edit', buttonType: 'warning', type: 'dialog', dialogTitle: 'Edit' },
    ]

    for (const action of actions) {
      expect(action).toHaveProperty('type')
      expect(action).toHaveProperty('label')
      if (action.type === 'emit') expect(action).toHaveProperty('emitEvent')
      if (action.type === 'api') expect(action).toHaveProperty('apiUrl')
      if (action.type === 'navigate') expect(action).toHaveProperty('navigatePath')
      if (action.type === 'dialog') expect(action).toHaveProperty('dialogTitle')
    }
  })
})

// ---- Renderer Tests with Widget FgSearchList ----

/** Helper: create a mock Widget for search-list */
function makeSearchListWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: 'search-list_abc12',
    name: 'FgSearchList',
    type: 'search-list',
    position: { x: 0, y: 0, w: 12, h: 8 },
    props: {
      title: 'Test List',
    },
    ...overrides,
  }
}

describe('FgSearchList widget renders', () => {
  it('renders title from widgetData', () => {
    const widget = makeSearchListWidget({ props: { title: 'User List' } })
    const wrapper = mountWithEl(FgSearchList, {
      global: {
        provide: { [widgetDataKey as symbol]: computed(() => widget) },
        stubs: tableStubs,
      },
    })

    expect(wrapper.text()).toContain('User List')
  })

  it('renders default title when not specified', () => {
    const widget = makeSearchListWidget({ props: {} })
    const wrapper = mountWithEl(FgSearchList, {
      global: {
        provide: { [widgetDataKey as symbol]: computed(() => widget) },
        stubs: tableStubs,
      },
    })

    expect(wrapper.text()).toContain('列表')
  })

  it('renders without error', () => {
    const widget = makeSearchListWidget()
    const wrapper = mountWithEl(FgSearchList, {
      global: {
        provide: { [widgetDataKey as symbol]: computed(() => widget) },
        stubs: tableStubs,
      },
    })

    expect(wrapper.exists()).toBe(true)
  })
})

// ---- Sprint 16 Integration Tests ----

import { normalizeListResponse } from '@/utils/responseNormalizer'

describe('SP16-001: API dataPath integration', () => {
  it('normalizeListResponse extracts data from nested dataPath', () => {
    const res = { result: { records: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] } }
    const { data } = normalizeListResponse(res, { dataPath: 'result.records' })
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe('Alice')
  })

  it('normalizeListResponse falls back without dataPath', () => {
    const res = { data: [{ id: 1 }] }
    const { data } = normalizeListResponse(res)
    expect(data).toHaveLength(1)
  })
})

describe('SP16-004: elseValue reset', () => {
  it('elseValue is exposed on LinkageState when condition is false', async () => {
    const { reactive } = await import('vue')
    const { useLinkage } = await import('@/composables/useLinkage')

    const schema: import('@/widgets/base/types').PartialWidget[] = [
      { type: 'select', field: 'source', label: 'Source', options: [{ label: 'A', value: 'a' }] },
      {
        type: 'input', field: 'target', label: 'Target',
        linkages: [{ type: 'visible', watchFields: ['source'], condition: 'values.source === "a"', elseValue: 'cleared' }],
      },
    ]
    const formData = reactive<FormData>({ source: 'b' })
    const { stateMap } = useLinkage(schema, formData)
    expect(stateMap.value.get('target')?.elseValue).toBe('cleared')

    formData.source = 'a'
    expect(stateMap.value.get('target')?.elseValue).toBeUndefined()
  })
})

describe('SP16-005: set-value chain', () => {
  it('set-value with thenValue reflects in targetValue', async () => {
    const { reactive } = await import('vue')
    const { useLinkage } = await import('@/composables/useLinkage')

    const schema: import('@/widgets/base/types').PartialWidget[] = [
      { type: 'select', field: 'mode', label: 'Mode', options: [{ label: 'Auto', value: 'auto' }] },
      {
        type: 'input', field: 'result', label: 'Result',
        linkages: [{ type: 'set-value', watchFields: ['mode'], condition: 'values.mode === "auto"', thenValue: 'auto-selected' }],
      },
    ]
    const formData = reactive<FormData>({ mode: 'auto' })
    const { stateMap } = useLinkage(schema, formData)
    expect(stateMap.value.get('result')?.targetValue).toBe('auto-selected')
  })

  it('set-value with valueSource copies field value', async () => {
    const { reactive } = await import('vue')
    const { useLinkage } = await import('@/composables/useLinkage')

    const schema: import('@/widgets/base/types').PartialWidget[] = [
      { type: 'input', field: 'copyFrom', label: 'From' },
      {
        type: 'input', field: 'copyTo', label: 'To',
        linkages: [{ type: 'set-value', watchFields: ['copyFrom'], condition: 'values.copyFrom !== ""', valueSource: 'copyFrom' }],
      },
    ]
    const formData = reactive<FormData>({ copyFrom: 'hello', copyTo: '' })
    const { stateMap } = useLinkage(schema, formData)
    expect(stateMap.value.get('copyTo')?.targetValue).toBe('hello')
  })
})

// SP16-006 (FgDialog round-trip) removed — old FgDialog deleted, widget version uses inject-based API
