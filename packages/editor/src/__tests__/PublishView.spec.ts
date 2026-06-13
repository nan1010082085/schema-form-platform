/**
 * PublishView unit tests
 *
 * Tests the postMessage protocol handling and WidgetRenderer prop binding.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, defineComponent } from 'vue'
import TDesign from 'tdesign-vue-next'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { id: 'test-publish-id' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock API client
vi.mock('@/utils/apiClient', () => ({
  fetchPublishedByPublishId: vi.fn().mockResolvedValue({
    id: 'test-id',
    publishId: 'test-publish-id',
    name: 'Test Schema',
    json: [
      { type: 'input', field: 'name', label: 'Name' },
      { type: 'input', field: 'comment', label: 'Comment' },
    ],
  }),
  fetchPublishedSchema: vi.fn(),
  configureApiClient: vi.fn(),
}))

// Mock microapp bridge
const sendToHostMock = vi.fn()
vi.mock('@/microapp/bridge', () => ({
  sendToHost: (...args: unknown[]) => sendToHostMock(...args),
}))

// Mock widgets registration
vi.mock('@/widgets', () => ({
  registerAllWidgets: vi.fn(),
}))

// Mock WidgetRenderer with exposed methods
vi.mock('@/components/WidgetRenderer', () => ({
  WidgetRenderer: defineComponent({
    name: 'WidgetRenderer',
    props: ['schema', 'layout', 'user', 'request', 'global', 'readonly', 'editableFields', 'readonlyFields'],
    emits: ['submit'],
    setup(_, { expose }) {
      expose({
        getFormData: () => ({ name: 'test', comment: '' }),
        setFormData: vi.fn(),
        validate: () => Promise.resolve(true),
        submit: vi.fn(),
        resetFields: vi.fn(),
      })
      return () => '<div class="widget-renderer-stub" />'
    },
  }),
}))

import PublishView from '../views/PublishView.vue'

/** Dispatch a MessageEvent with the given data */
function dispatchMessage(data: Record<string, unknown>) {
  window.dispatchEvent(new MessageEvent('message', { data }))
}

describe('PublishView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sendToHostMock.mockClear()
  })

  async function createAndLoad() {
    const wrapper = mount(PublishView, {
      global: {
        plugins: [createPinia(), ElementPlus],
        stubs: {
          'el-icon': true,
          Loading: true,
          CircleCloseFilled: true,
        },
      },
    })
    await flushPromises()
    await nextTick()
    return wrapper
  }

  it('defaults to edit mode (readonly=false, no field restrictions)', async () => {
    const wrapper = await createAndLoad()
    const renderer = wrapper.findComponent({ name: 'WidgetRenderer' })
    expect(renderer.exists()).toBe(true)
    expect(renderer.props('readonly')).toBe(false)
    expect(renderer.props('editableFields')).toBeUndefined()
    expect(renderer.props('readonlyFields')).toBeUndefined()
  })

  it('handles fg:set-mode for all three modes in sequence', async () => {
    const wrapper = await createAndLoad()
    const renderer = wrapper.findComponent({ name: 'WidgetRenderer' })
    expect(renderer.exists()).toBe(true)

    // 1. view mode → readonly=true
    dispatchMessage({ type: 'fg:set-mode', mode: 'view' })
    await nextTick()
    expect(renderer.props('readonly')).toBe(true)
    expect(renderer.props('editableFields')).toBeUndefined()
    expect(renderer.props('readonlyFields')).toBeUndefined()

    // 2. partial mode with editableFields
    dispatchMessage({
      type: 'fg:set-mode',
      mode: 'partial',
      editableFields: ['comment'],
    })
    await nextTick()
    expect(renderer.props('readonly')).toBe(false)
    expect(renderer.props('editableFields')).toEqual(['comment'])

    // 3. partial mode with readonlyFields
    dispatchMessage({
      type: 'fg:set-mode',
      mode: 'partial',
      readonlyFields: ['name'],
    })
    await nextTick()
    expect(renderer.props('readonlyFields')).toEqual(['name'])

    // 4. back to edit mode → clears field restrictions
    dispatchMessage({ type: 'fg:set-mode', mode: 'edit' })
    await nextTick()
    expect(renderer.props('readonly')).toBe(false)
    expect(renderer.props('editableFields')).toBeUndefined()
    expect(renderer.props('readonlyFields')).toBeUndefined()
  })

  it('includes requestId in fg:data-response when get-data has requestId', async () => {
    await createAndLoad()

    dispatchMessage({ type: 'fg:get-data', requestId: 'req-123' })
    await nextTick()
    await flushPromises()

    const dataResponse = sendToHostMock.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).type === 'fg:data-response',
    )
    expect(dataResponse).toBeTruthy()
    const msg = dataResponse![0] as Record<string, unknown>
    expect(msg.requestId).toBe('req-123')
  })

  it('includes requestId in fg:validate-response', async () => {
    await createAndLoad()

    dispatchMessage({ type: 'fg:validate', requestId: 'req-456' })
    await nextTick()
    await flushPromises()
    await new Promise((r) => setTimeout(r, 10))

    const validateResponse = sendToHostMock.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).type === 'fg:validate-response',
    )
    expect(validateResponse).toBeTruthy()
    const msg = validateResponse![0] as Record<string, unknown>
    expect(msg.requestId).toBe('req-456')
    expect(msg.valid).toBe(true)
  })

  it('fg:get-data without requestId still sends response', async () => {
    await createAndLoad()

    dispatchMessage({ type: 'fg:get-data' })
    await nextTick()
    await flushPromises()

    const dataResponse = sendToHostMock.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).type === 'fg:data-response',
    )
    expect(dataResponse).toBeTruthy()
  })

  it('handles fg:submit without errors', async () => {
    await createAndLoad()

    dispatchMessage({ type: 'fg:submit' })
    await nextTick()
    await flushPromises()
  })

  it('removes message listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const wrapper = mount(PublishView, {
      global: {
        plugins: [createPinia(), ElementPlus],
        stubs: { 'el-icon': true, Loading: true, CircleCloseFilled: true },
      },
    })
    wrapper.unmount()
    expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function))
  })
})
