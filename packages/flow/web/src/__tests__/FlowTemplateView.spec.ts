import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FlowTemplateView from '../views/FlowTemplateView.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../api/flowApi', () => ({
  flowApi: {
    listTemplates: vi.fn(),
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    applyTemplate: vi.fn(),
    seedBuiltinTemplates: vi.fn(),
    saveAsTemplate: vi.fn(),
  },
}))

import { flowApi } from '../api/flowApi'
const mockedApi = vi.mocked(flowApi)

const mockTemplates = [
  {
    id: 'tpl-1',
    name: '请假审批',
    description: '标准请假流程模板',
    category: '审批',
    graph: { nodes: [], edges: [] },
    thumbnail: '',
    tags: ['请假', '审批'],
    isBuiltin: true,
    useCount: 42,
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tpl-2',
    name: '报销流程',
    description: '费用报销审批流程',
    category: '财务',
    graph: { nodes: [], edges: [] },
    thumbnail: 'data:image/png;base64,abc',
    tags: ['报销'],
    isBuiltin: false,
    useCount: 5,
    createdBy: 'user-1',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
]

describe('FlowTemplateView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockedApi.listTemplates.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })
    mockedApi.seedBuiltinTemplates.mockResolvedValue({ created: 0, skipped: 0 })
  })

  function createWrapper() {
    return mount(FlowTemplateView, {
      global: {
        plugins: [TDesign],
        directives: {
          loading: () => {},
        },
      },
    })
  }

  it('mounts without errors', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })

  it('displays template view title', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('h2').text()).toContain('流程模板库')
  })

  it('calls seedBuiltinTemplates and fetchTemplates on mount', async () => {
    createWrapper()
    await flushPromises()
    expect(mockedApi.seedBuiltinTemplates).toHaveBeenCalled()
    expect(mockedApi.listTemplates).toHaveBeenCalled()
  })

  it('has search input', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.t-input').exists()).toBe(true)
  })

  it('has category filter select', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.t-select').exists()).toBe(true)
  })

  it('displays template cards with use count', async () => {
    mockedApi.listTemplates.mockResolvedValue({
      items: mockTemplates,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })
    const wrapper = createWrapper()
    await flushPromises()

    const cards = wrapper.findAll('.t-card, [class*="card"]')
    expect(cards.length).toBeGreaterThanOrEqual(2)

    // Check use count is displayed
    const text = wrapper.text()
    expect(text).toContain('42 次使用')
    expect(text).toContain('5 次使用')
  })

  it('displays template description', async () => {
    mockedApi.listTemplates.mockResolvedValue({
      items: mockTemplates,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('标准请假流程模板')
    expect(wrapper.text()).toContain('费用报销审批流程')
  })

  it('displays template tags', async () => {
    mockedApi.listTemplates.mockResolvedValue({
      items: mockTemplates,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('请假')
    expect(wrapper.text()).toContain('报销')
  })

  it('displays builtin tag for built-in templates', async () => {
    mockedApi.listTemplates.mockResolvedValue({
      items: mockTemplates,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })
    const wrapper = createWrapper()
    await flushPromises()

    const builtinTags = wrapper.findAll('.t-tag--success')
    expect(builtinTags.length).toBe(1)
  })

  it('shows empty state when no templates', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('.t-empty').exists()).toBe(true)
  })

  it('displays category information', async () => {
    mockedApi.listTemplates.mockResolvedValue({
      items: mockTemplates,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('审批')
    expect(wrapper.text()).toContain('财务')
  })
})
