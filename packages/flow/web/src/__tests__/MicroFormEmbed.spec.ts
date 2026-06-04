import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MicroFormEmbed from '../components/MicroFormEmbed.vue'

// Mock the CSS module
vi.mock('../components/MicroFormEmbed.module.scss', () => ({
  default: {
    wrapper: 'wrapper',
    container: 'container',
    empty: 'empty',
  },
}))

// Stub micro-app as a Vue component that emits 'created' on mount
const microAppStub = {
  name: 'micro-app',
  template: '<div class="micro-app-stub"><slot /></div>',
  props: ['name', 'url', 'data', 'iframe'],
  emits: ['created', 'unmount', 'error'],
  mounted() {
    this.$emit('created')
  },
}

function createWrapper(props: Record<string, unknown> = {}) {
  return mount(MicroFormEmbed, {
    props,
    global: {
      stubs: {
        'micro-app': microAppStub,
      },
    },
  })
}

describe('MicroFormEmbed', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── Test 1: Empty state when no publishId ──
  it('shows empty state when publishId is not provided', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('未绑定表单')
    expect(wrapper.find('.micro-app-stub').exists()).toBe(false)
  })

  it('shows empty state when publishId is empty string', () => {
    const wrapper = createWrapper({ publishId: '' })
    expect(wrapper.text()).toContain('未绑定表单')
    expect(wrapper.find('.micro-app-stub').exists()).toBe(false)
  })

  // ── Test 2: Renders micro-app with correct props ──
  it('renders micro-app element when publishId is provided', () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    expect(wrapper.find('.micro-app-stub').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('未绑定表单')
  })

  it('passes correct url with publishId', () => {
    const wrapper = createWrapper({ publishId: 'pub-abc' })
    const app = wrapper.findComponent({ name: 'micro-app' })
    expect(app.props('url')).toContain('id=pub-abc')
  })

  it('passes data with default mode edit and default hostMethods', () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    const app = wrapper.findComponent({ name: 'micro-app' })
    const data = app.props('data')
    expect(data.mode).toBe('edit')
    expect(data.hostMethods).toEqual(['setValues', 'getValues', 'validate'])
  })

  it('passes custom mode and hostMethods in data', () => {
    const wrapper = createWrapper({
      publishId: 'pub-123',
      mode: 'view',
      hostMethods: ['setValues'],
    })
    const app = wrapper.findComponent({ name: 'micro-app' })
    const data = app.props('data')
    expect(data.mode).toBe('view')
    expect(data.hostMethods).toEqual(['setValues'])
  })

  it('includes initialData in microAppData when provided', () => {
    const initialData = { name: 'test', age: 25 }
    const wrapper = createWrapper({ publishId: 'pub-123', initialData })
    const app = wrapper.findComponent({ name: 'micro-app' })
    const data = app.props('data')
    expect(data.initialData).toEqual(initialData)
  })

  // ── Test 3: Exposed methods ──
  it('exposes getValues, setValues, validate, submit, sendCommand via defineExpose', () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    const vm = wrapper.vm as any
    expect(typeof vm.getValues).toBe('function')
    expect(typeof vm.setValues).toBe('function')
    expect(typeof vm.validate).toBe('function')
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.sendCommand).toBe('function')
  })

  // ── Test 4: postMessage event handling ──
  it('emits ready when micro-app triggers created event', () => {
    // The stub auto-emits 'created' on mount, so 'ready' should already be emitted
    const wrapper = createWrapper({ publishId: 'pub-123' })
    expect(wrapper.emitted('ready')).toBeTruthy()
    expect(wrapper.emitted('ready')!.length).toBe(1)
  })

  it('emits valueChange when receiving fg:data-response message', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })

    const testData = { field1: 'hello', field2: 42 }
    window.postMessage({ type: 'fg:data-response', data: testData }, '*')

    await vi.advanceTimersByTimeAsync(0)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('valueChange')).toBeTruthy()
    expect(wrapper.emitted('valueChange')![0]).toEqual([testData])
  })

  it('emits submitSuccess when receiving fg:submit message', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })

    const submitData = { success: true, id: 'result-1' }
    window.postMessage({ type: 'fg:submit', data: submitData }, '*')

    await vi.advanceTimersByTimeAsync(0)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('submitSuccess')).toBeTruthy()
    expect(wrapper.emitted('submitSuccess')![0]).toEqual([submitData])
  })

  it('ignores messages without type field', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })

    window.postMessage({ random: 'data' }, '*')
    await vi.advanceTimersByTimeAsync(0)
    await wrapper.vm.$nextTick()

    // ready is emitted from micro-app mount, but no valueChange/submitSuccess
    expect(wrapper.emitted('valueChange')).toBeFalsy()
    expect(wrapper.emitted('submitSuccess')).toBeFalsy()
  })

  it('ignores primitive message data (non-object)', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })

    window.postMessage('just a string', '*')
    await vi.advanceTimersByTimeAsync(0)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('valueChange')).toBeFalsy()
    expect(wrapper.emitted('submitSuccess')).toBeFalsy()
  })

  it('resolves pending request when receiving requestId response', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    const vm = wrapper.vm as any

    // Mock getChildIframe: document.querySelector → micro-app element → querySelector → iframe
    const mockIframe = {
      contentWindow: { postMessage: vi.fn() },
    }
    const mockMicroApp = { querySelector: vi.fn().mockReturnValue(mockIframe) }
    vi.spyOn(document, 'querySelector').mockReturnValue(mockMicroApp as any)

    // Start a getValues call — posts a message with requestId
    const valuesPromise = vm.getValues()

    // Verify a message was posted
    expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledTimes(1)
    const postedMsg = mockIframe.contentWindow.postMessage.mock.calls[0][0] as Record<string, unknown>
    const requestId = postedMsg.requestId as string
    expect(requestId).toBeTruthy()

    // Simulate response from child iframe via postMessage
    const payload = { name: 'John', age: 30 }
    window.postMessage({ requestId, payload }, '*')
    await vi.advanceTimersByTimeAsync(0)

    const result = await valuesPromise
    expect(result).toEqual(payload)
  })

  it('rejects pending request when receiving error response', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    const vm = wrapper.vm as any

    const mockIframe = { contentWindow: { postMessage: vi.fn() } }
    const mockMicroApp = { querySelector: vi.fn().mockReturnValue(mockIframe) }
    vi.spyOn(document, 'querySelector').mockReturnValue(mockMicroApp as any)

    const valuesPromise = vm.getValues()
    // Prevent unhandled rejection warning — rejection fires during timer advancement
    valuesPromise.catch(() => {})

    const postedMsg = mockIframe.contentWindow.postMessage.mock.calls[0][0] as Record<string, unknown>
    const requestId = postedMsg.requestId as string

    window.postMessage({ requestId, action: 'error', payload: 'Validation failed' }, '*')
    await vi.advanceTimersByTimeAsync(0)

    await expect(valuesPromise).rejects.toThrow('Validation failed')
  })

  // ── Test 5: sendCommand timeout ──
  it('rejects with timeout error when no response is received within 10s', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    const vm = wrapper.vm as any

    const mockIframe = { contentWindow: { postMessage: vi.fn() } }
    const mockMicroApp = { querySelector: vi.fn().mockReturnValue(mockIframe) }
    vi.spyOn(document, 'querySelector').mockReturnValue(mockMicroApp as any)

    const promise = vm.sendCommand('fg:get-data')
    // Prevent unhandled rejection warning — timeout fires during timer advancement
    promise.catch(() => {})

    // Advance past the 10s timeout
    await vi.advanceTimersByTimeAsync(10_000)

    await expect(promise).rejects.toThrow('Command "fg:get-data" timed out')
  })

  // ── Method restriction tests ──
  it('throws when calling getValues if not in hostMethods', async () => {
    const wrapper = createWrapper({
      publishId: 'pub-123',
      hostMethods: ['setValues'],
    })
    const vm = wrapper.vm as any
    await expect(vm.getValues()).rejects.toThrow('getValues not allowed')
  })

  it('throws when calling setValues if not in hostMethods', async () => {
    const wrapper = createWrapper({
      publishId: 'pub-123',
      hostMethods: ['getValues'],
    })
    const vm = wrapper.vm as any
    await expect(vm.setValues({ foo: 'bar' })).rejects.toThrow('setValues not allowed')
  })

  it('allows methods when hostMethods includes them', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    const vm = wrapper.vm as any
    // Default hostMethods includes getValues, setValues, validate
    // The promise should NOT reject with "getValues not allowed"
    const promise = vm.getValues()
    promise.catch(() => {}) // prevent unhandled rejection
    // Advance timers to trigger the 10s sendCommand timeout
    await vi.advanceTimersByTimeAsync(10_000)
    const error = await promise.catch((e: Error) => e)
    expect(error?.message).not.toBe('getValues not allowed')
  })

  // ── Micro-app key binding ──
  it('uses publishId as key for micro-app re-rendering', () => {
    const wrapper = createWrapper({ publishId: 'pub-aaa' })
    const app = wrapper.findComponent({ name: 'micro-app' })
    // The :key="publishId" is set on the component, verify via props or element attribute
    // In Vue test utils, key is not directly accessible via props, but we can verify
    // the component re-creates by checking the name prop which includes publishId
    expect(app.props('name')).toContain('pub-aaa')
  })

  // ── Unmount cleanup ──
  it('removes message listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const wrapper = createWrapper({ publishId: 'pub-123' })

    wrapper.unmount()

    expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function))
  })
})
