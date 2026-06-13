import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MicroFormEmbed from '../components/MicroFormEmbed.vue'

// Mock the CSS module
vi.mock('../components/MicroFormEmbed.module.scss', () => ({
  default: {
    wrapper: 'wrapper',
    container: 'container',
    empty: 'empty',
    iframe: 'iframe',
  },
}))

// Track postMessage calls for assertions
const postMessageSpy = vi.fn()

function createWrapper(props: Record<string, unknown> = {}) {
  const wrapper = mount(MicroFormEmbed, {
    props,
    attachTo: document.body,
  })

  // Mock contentWindow.postMessage on the real iframe element
  const iframeWrapper = wrapper.find('iframe')
  if (iframeWrapper.exists()) {
    const iframeEl = iframeWrapper.element as HTMLIFrameElement
    Object.defineProperty(iframeEl, 'contentWindow', {
      value: { postMessage: postMessageSpy },
      configurable: true,
    })
    // Trigger the load event manually since jsdom doesn't load iframes
    iframeEl.dispatchEvent(new Event('load'))
  }

  return wrapper
}

describe('MicroFormEmbed', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    postMessageSpy.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── Test 1: Empty state when no publishId ──
  it('shows empty state when publishId is not provided', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('未绑定表单')
    expect(wrapper.find('iframe').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows empty state when publishId is empty string', () => {
    const wrapper = createWrapper({ publishId: '' })
    expect(wrapper.text()).toContain('未绑定表单')
    expect(wrapper.find('iframe').exists()).toBe(false)
    wrapper.unmount()
  })

  // ── Test 2: Renders iframe with correct src ──
  it('renders iframe element when publishId is provided', () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    expect(wrapper.find('iframe').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('未绑定表单')
    wrapper.unmount()
  })

  it('passes correct src with publishId', () => {
    const wrapper = createWrapper({ publishId: 'pub-abc' })
    const iframe = wrapper.find('iframe')
    expect(iframe.attributes('src')).toContain('id=pub-abc')
    wrapper.unmount()
  })

  it('includes mode in iframe src', () => {
    const wrapper = createWrapper({ publishId: 'pub-123', mode: 'view' })
    const iframe = wrapper.find('iframe')
    expect(iframe.attributes('src')).toContain('mode=view')
    wrapper.unmount()
  })

  it('defaults mode to edit in iframe src', () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    const iframe = wrapper.find('iframe')
    expect(iframe.attributes('src')).toContain('mode=edit')
    wrapper.unmount()
  })

  // ── Test: fg:set-mode sent on iframe load ──
  it('sends fg:set-mode message to child iframe after load', async () => {
    createWrapper({ publishId: 'pub-123', mode: 'partial', editableFields: ['comment'] })

    // requestAnimationFrame needs timer advancement to flush
    await vi.advanceTimersByTimeAsync(16)

    expect(postMessageSpy).toHaveBeenCalled()
    const setModeMsg = postMessageSpy.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).type === 'fg:set-mode',
    )
    expect(setModeMsg).toBeTruthy()
    const msg = setModeMsg![0] as Record<string, unknown>
    expect(msg.mode).toBe('partial')
    expect(msg.editableFields).toEqual(['comment'])
  })

  it('sends fg:set-data with initialData after load', async () => {
    const initialData = { name: 'test' }
    createWrapper({ publishId: 'pub-123', initialData })

    await vi.advanceTimersByTimeAsync(16)

    const setDataMsg = postMessageSpy.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).type === 'fg:set-data',
    )
    expect(setDataMsg).toBeTruthy()
    const msg = setDataMsg![0] as Record<string, unknown>
    expect(msg.data).toEqual(initialData)
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
    wrapper.unmount()
  })

  // ── Test 4: postMessage event handling ──
  it('emits ready when iframe triggers load event', () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    expect(wrapper.emitted('ready')).toBeTruthy()
    expect(wrapper.emitted('ready')!.length).toBe(1)
    wrapper.unmount()
  })

  it('emits valueChange when receiving fg:data-response message', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })

    const testData = { field1: 'hello', field2: 42 }
    window.postMessage({ type: 'fg:data-response', data: testData }, '*')

    await vi.advanceTimersByTimeAsync(0)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('valueChange')).toBeTruthy()
    expect(wrapper.emitted('valueChange')![0]).toEqual([testData])
    wrapper.unmount()
  })

  it('emits submitSuccess when receiving fg:submit message', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })

    const submitData = { success: true, id: 'result-1' }
    window.postMessage({ type: 'fg:submit', data: submitData }, '*')

    await vi.advanceTimersByTimeAsync(0)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('submitSuccess')).toBeTruthy()
    expect(wrapper.emitted('submitSuccess')![0]).toEqual([submitData])
    wrapper.unmount()
  })

  it('ignores messages without type field', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })

    window.postMessage({ random: 'data' }, '*')
    await vi.advanceTimersByTimeAsync(0)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('valueChange')).toBeFalsy()
    expect(wrapper.emitted('submitSuccess')).toBeFalsy()
    wrapper.unmount()
  })

  it('ignores primitive message data (non-object)', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })

    window.postMessage('just a string', '*')
    await vi.advanceTimersByTimeAsync(0)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('valueChange')).toBeFalsy()
    expect(wrapper.emitted('submitSuccess')).toBeFalsy()
    wrapper.unmount()
  })

  it('resolves pending request when receiving requestId response', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    const vm = wrapper.vm as any

    // Start a getValues call — posts a message with requestId
    const valuesPromise = vm.getValues()

    // Verify a message was posted
    expect(postMessageSpy).toHaveBeenCalledTimes(1)
    const postedMsg = postMessageSpy.mock.calls[0][0] as Record<string, unknown>
    const requestId = postedMsg.requestId as string
    expect(requestId).toBeTruthy()

    // Simulate response from child iframe via postMessage
    const payload = { name: 'John', age: 30 }
    window.postMessage({ requestId, payload }, '*')
    await vi.advanceTimersByTimeAsync(0)

    const result = await valuesPromise
    expect(result).toEqual(payload)
    wrapper.unmount()
  })

  it('rejects pending request when receiving error response', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    const vm = wrapper.vm as any

    const valuesPromise = vm.getValues()
    valuesPromise.catch(() => {})

    const postedMsg = postMessageSpy.mock.calls[0][0] as Record<string, unknown>
    const requestId = postedMsg.requestId as string

    window.postMessage({ requestId, action: 'error', payload: 'Validation failed' }, '*')
    await vi.advanceTimersByTimeAsync(0)

    await expect(valuesPromise).rejects.toThrow('Validation failed')
    wrapper.unmount()
  })

  // ── Test 5: sendCommand timeout ──
  it('rejects with timeout error when no response is received within 10s', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    const vm = wrapper.vm as any

    const promise = vm.sendCommand('fg:get-data')
    promise.catch(() => {})

    await vi.advanceTimersByTimeAsync(10_000)

    await expect(promise).rejects.toThrow('Command "fg:get-data" timed out')
    wrapper.unmount()
  })

  // ── Method restriction tests ──
  it('throws when calling getValues if not in hostMethods', async () => {
    const wrapper = createWrapper({
      publishId: 'pub-123',
      hostMethods: ['setValues'],
    })
    const vm = wrapper.vm as any
    await expect(vm.getValues()).rejects.toThrow('getValues not allowed')
    wrapper.unmount()
  })

  it('throws when calling setValues if not in hostMethods', async () => {
    const wrapper = createWrapper({
      publishId: 'pub-123',
      hostMethods: ['getValues'],
    })
    const vm = wrapper.vm as any
    await expect(vm.setValues({ foo: 'bar' })).rejects.toThrow('setValues not allowed')
    wrapper.unmount()
  })

  it('allows methods when hostMethods includes them', async () => {
    const wrapper = createWrapper({ publishId: 'pub-123' })
    const vm = wrapper.vm as any
    const promise = vm.getValues()
    promise.catch(() => {})
    await vi.advanceTimersByTimeAsync(10_000)
    const error = await promise.catch((e: Error) => e)
    expect(error?.message).not.toBe('getValues not allowed')
    wrapper.unmount()
  })

  // ── Iframe src includes publishId ──
  it('uses publishId in iframe src URL', () => {
    const wrapper = createWrapper({ publishId: 'pub-aaa' })
    const iframe = wrapper.find('iframe')
    expect(iframe.attributes('src')).toContain('id=pub-aaa')
    wrapper.unmount()
  })

  // ── Unmount cleanup ──
  it('removes message listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const wrapper = createWrapper({ publishId: 'pub-123' })

    wrapper.unmount()

    expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function))
  })
})
