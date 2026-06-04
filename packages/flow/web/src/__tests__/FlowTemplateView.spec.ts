import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ElementPlus from 'element-plus'
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
        plugins: [ElementPlus],
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
    expect(wrapper.find('.el-input').exists()).toBe(true)
  })

  it('has category filter select', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.el-select').exists()).toBe(true)
  })
})
