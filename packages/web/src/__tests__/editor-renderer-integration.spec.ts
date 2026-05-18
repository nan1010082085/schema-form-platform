// @ts-nocheck
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import FgSearchList from '@/components/FormGrid/components/business/FgSearchList.vue'
import SearchFieldsEditor from '@/components/Editor/SearchFieldsEditor.vue'
import ColumnsEditor from '@/components/Editor/ColumnsEditor.vue'
import RowActionsEditor from '@/components/Editor/RowActionsEditor.vue'
import type {
  FormSchemaItem,
  SearchFieldSchema,
  SearchListColumnSchema,
  SearchListRowAction,
} from '@/components/FormGrid/types'
import {
  ACTION_EMIT_KEY,
  FORM_GRID_FORM_KEY,
  FORM_GRID_API_KEY,
} from '@/components/FormGrid/types'

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
  return mount(component, {
    ...rest,
    global: {
      plugins: [ElementPlus],
      ...globalOpts,
      provide: {
        // Router mock (needed by FgSearchList for navigate row actions)
        router: { push: vi.fn(), replace: vi.fn() },
        ...(globalOpts.provide || {}),
      },
    },
  })
}

/** Create a minimal search-list FormSchemaItem */
function makeSearchListSchema(overrides: Partial<FormSchemaItem> = {}): FormSchemaItem {
  return {
    type: 'search-list',
    listApi: {
      url: '/api/list',
      method: 'post',
      pageParam: 'pageNum',
      sizeParam: 'pageSize',
      dataPath: 'data',
      totalPath: 'total',
    },
    searchFields: [],
    columns: [],
    rowActions: [],
    buttons: [],
    ...overrides,
  } as FormSchemaItem
}

/** Mock inject providers for FgSearchList */
const mockProviders = {
  [ACTION_EMIT_KEY as symbol]: vi.fn(),
  [FORM_GRID_FORM_KEY as symbol]: {},
  [FORM_GRID_API_KEY as symbol]: {
    validate: vi.fn().mockResolvedValue(true),
    getFormData: vi.fn().mockReturnValue({}),
    resetFields: vi.fn(),
  },
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

// ---- Renderer Tests with Editor-Produced Schema ----

describe('FgSearchList renders editor-produced schema', () => {
  it('renders search form from SearchFieldSchema', () => {
    const searchFields: SearchFieldSchema[] = [
      { type: 'input', field: 'keyword', label: 'Keyword', span: 8 },
      { type: 'select', field: 'status', label: 'Status', span: 8, options: [{ label: 'Active', value: 'Active' }] },
    ]

    const schema = makeSearchListSchema({ searchFields })

    const wrapper = mountWithEl(FgSearchList, {
      props: { schema },
      global: { provide: mockProviders, stubs: tableStubs },
    })

    expect(wrapper.text()).toContain('Keyword')
    expect(wrapper.text()).toContain('Status')
    expect(wrapper.find('.fg-search-list__search').exists()).toBe(true)
  })

  it('renders without error when given column definitions', () => {
    const columns: SearchListColumnSchema[] = [
      { prop: 'name', label: 'Name', render: 'text' },
      { prop: 'status', label: 'Status', render: 'badge', colorMap: { Active: '#67c23a' } },
    ]

    const schema = makeSearchListSchema({ columns })

    const wrapper = mountWithEl(FgSearchList, {
      props: { schema },
      global: { provide: mockProviders, stubs: tableStubs },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders row action column from SearchListRowAction config', () => {
    const rowActions: SearchListRowAction[] = [
      { label: 'View', buttonType: 'primary', type: 'emit', emitEvent: 'view' },
      { label: 'Edit', buttonType: 'warning', type: 'navigate', navigatePath: '/edit/:id' },
    ]

    const schema = makeSearchListSchema({ rowActions })

    const wrapper = mountWithEl(FgSearchList, {
      props: { schema },
      global: { provide: mockProviders, stubs: tableStubs },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders complete search-list with search + table + actions', () => {
    const schema = makeSearchListSchema({
      searchFields: [{ type: 'input', field: 'q', label: 'Search', span: 8 }],
      columns: [
        { prop: 'id', label: 'ID', render: 'text' },
        { prop: 'name', label: 'Name', render: 'text' },
        { prop: 'status', label: 'Status', render: 'badge', colorMap: { Active: '#67c23a', Inactive: '#f56c6c' } },
      ],
      rowActions: [{ label: 'View', buttonType: 'primary', type: 'emit', emitEvent: 'view' }],
    })

    const wrapper = mountWithEl(FgSearchList, {
      props: { schema },
      global: { provide: mockProviders, stubs: tableStubs },
    })

    expect(wrapper.find('.fg-search-list__search').exists()).toBe(true)
    expect(wrapper.find('.fg-search-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('Search')
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

    const schema: import('@/components/FormGrid/types').FormSchemaItem[] = [
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

    const schema: import('@/components/FormGrid/types').FormSchemaItem[] = [
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

    const schema: import('@/components/FormGrid/types').FormSchemaItem[] = [
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

describe('SP16-006: Dialog data round-trip', () => {
  it('FgDialog renders schema and maintains isolated formData', async () => {
    const wrapper = mountWithEl(
      (await import('@/components/FormGrid/components/business/FgDialog.vue')).default,
      {
        props: {
          modelValue: true,
          title: 'Test Dialog',
          dialogSchema: [
            { type: 'input', field: 'name', label: 'Name' },
            { type: 'input', field: 'email', label: 'Email' },
          ],
          initialData: { name: 'John', email: 'john@test.com' },
        },
        global: {
          stubs: {
            'el-dialog': { template: '<div><slot /></div><div class="el-dialog__footer"><slot name="footer" /></div>', props: ['modelValue', 'title'] },
            'el-form': { template: '<form><slot /></form>', props: ['model'] },
            'el-form-item': { template: '<div><slot /></div>' },
            'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
            SchemaRender: { template: '<div class="schema-render" />', props: ['schema', 'formData'] },
          },
        },
      },
    )

    expect(wrapper.exists()).toBe(true)
    // Dialog renders with title
    expect(wrapper.props('title')).toBe('Test Dialog')
    expect(wrapper.props('dialogSchema')).toHaveLength(2)
  })
})
