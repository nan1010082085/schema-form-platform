import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import FlowListView from '../views/FlowListView.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../api/flowApi', () => ({
  flowApi: {
    listFlows: vi.fn(),
    getFlow: vi.fn(),
    createFlow: vi.fn(),
    deleteFlow: vi.fn(),
    publishFlow: vi.fn(),
  },
}))

import { flowApi } from '../api/flowApi'
const mockedApi = vi.mocked(flowApi)

describe('FlowListView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockedApi.listFlows.mockResolvedValue({ items: [] } as any)
  })

  function createWrapper() {
    return mount(FlowListView, {
      global: {
        plugins: [ElementPlus],
        directives: {
          loading: () => {},
        },
      },
    })
  }

  it('mounts without errors', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('displays flow list table', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.el-table').exists()).toBe(true)
  })

  it('has create button', () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAll('button')
    const createBtn = buttons.find((b) => b.text().includes('新建流程'))
    expect(createBtn).toBeDefined()
  })

  it('calls store.fetchDefinitions on mount', () => {
    createWrapper()
    expect(mockedApi.listFlows).toHaveBeenCalled()
  })
})
