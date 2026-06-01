import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../api/flowApi', () => ({
  flowApi: {
    searchUsers: vi.fn(),
  },
}))

import UserPicker from '../components/UserPicker.vue'
import { flowApi } from '../api/flowApi'

const mockedApi = vi.mocked(flowApi)

const stubs = {
  'el-select': {
    template: `
      <div class="el-select-stub">
        <input
          class="el-select-stub__input"
          :placeholder="placeholder"
          :value="modelValue"
          @input="onInput"
          @change="onChange"
        />
        <slot />
      </div>
    `,
    props: ['modelValue', 'placeholder', 'multiple', 'filterable', 'remote', 'reserveKeyword', 'loading'],
    emits: ['update:modelValue', 'change'],
    methods: {
      onInput(e: Event) {
        const val = (e.target as HTMLInputElement).value
        this.$emit('update:modelValue', val)
      },
      onChange(e: Event) {
        const val = (e.target as HTMLInputElement).value
        this.$emit('change', val)
      },
    },
  },
  'el-option': {
    template: '<div class="el-option-stub">{{ label }}</div>',
    props: ['label', 'value'],
  },
}

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(UserPicker, {
    props: { modelValue: [], ...props },
    global: { stubs },
  })
}

describe('UserPicker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockedApi.searchUsers.mockResolvedValue({ items: [] } as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with default placeholder', () => {
    const wrapper = mountPicker()
    const input = wrapper.find('.el-select-stub__input')
    expect(input.attributes('placeholder')).toBe('搜索用户...')
  })

  it('renders with custom placeholder', () => {
    const wrapper = mountPicker({ placeholder: '选择用户' })
    const input = wrapper.find('.el-select-stub__input')
    expect(input.attributes('placeholder')).toBe('选择用户')
  })

  it('emits update:modelValue on change', async () => {
    const wrapper = mountPicker()
    const vm = wrapper.vm as any
    vm.onChange(['u1'])
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([['u1']])
  })

  it('calls flowApi.searchUsers on remote search after debounce', async () => {
    const wrapper = mountPicker()
    const vm = wrapper.vm as any
    vm.onSearch('test')
    await vi.advanceTimersByTime(300)
    await flushPromises()

    expect(mockedApi.searchUsers).toHaveBeenCalledWith('test')
  })

  it('does not call flowApi.searchUsers when search query is empty', async () => {
    const wrapper = mountPicker()
    const vm = wrapper.vm as any
    vm.onSearch('')
    await vi.advanceTimersByTime(300)
    await flushPromises()

    expect(mockedApi.searchUsers).not.toHaveBeenCalled()
  })

  it('populates options from flowApi response', async () => {
    mockedApi.searchUsers.mockResolvedValue({
      items: [
        { id: 'u1', username: 'alice', displayName: 'Alice', role: 'admin' },
        { id: 'u2', username: 'bob', displayName: 'Bob', role: 'user' },
      ],
    } as any)

    const wrapper = mountPicker()
    const vm = wrapper.vm as any
    vm.onSearch('a')
    await vi.advanceTimersByTime(300)
    await flushPromises()

    expect(vm.options).toHaveLength(2)
    expect(vm.options[0].id).toBe('u1')
    expect(vm.options[1].id).toBe('u2')
  })

  it('clears options when search fails', async () => {
    mockedApi.searchUsers.mockRejectedValue(new Error('network error'))

    const wrapper = mountPicker()
    const vm = wrapper.vm as any
    vm.onSearch('test')
    await vi.advanceTimersByTime(300)
    await flushPromises()

    expect(vm.options).toEqual([])
  })

  it('debounces rapid search calls', async () => {
    const wrapper = mountPicker()
    const vm = wrapper.vm as any

    vm.onSearch('a')
    vm.onSearch('ab')
    vm.onSearch('abc')
    await vi.advanceTimersByTime(300)
    await flushPromises()

    expect(mockedApi.searchUsers).toHaveBeenCalledTimes(1)
    expect(mockedApi.searchUsers).toHaveBeenCalledWith('abc')
  })

  it('clears options when search query becomes empty after having results', async () => {
    mockedApi.searchUsers.mockResolvedValue({
      items: [{ id: 'u1', username: 'alice', displayName: 'Alice', role: 'admin' }],
    } as any)

    const wrapper = mountPicker()
    const vm = wrapper.vm as any

    vm.onSearch('a')
    await vi.advanceTimersByTime(300)
    await flushPromises()
    expect(vm.options).toHaveLength(1)

    vm.onSearch('')
    await vi.advanceTimersByTime(300)
    await flushPromises()
    expect(vm.options).toEqual([])
  })

  it('passes props to el-select via stub', () => {
    const wrapper = mountPicker()
    const selectDiv = wrapper.find('.el-select-stub')
    expect(selectDiv.exists()).toBe(true)
    const input = selectDiv.find('input')
    expect(input.attributes('placeholder')).toBe('搜索用户...')
  })

  it('defaults modelValue to empty array', () => {
    const wrapper = mount(UserPicker, {
      global: { stubs },
    })
    const input = wrapper.find('.el-select-stub__input')
    expect(input.exists()).toBe(true)
  })

  it('shows loading state during search', async () => {
    let resolveSearch!: (v: any) => void
    mockedApi.searchUsers.mockImplementation(() =>
      new Promise(resolve => { resolveSearch = resolve })
    )

    const wrapper = mountPicker()
    const vm = wrapper.vm as any
    vm.onSearch('test')
    await vi.advanceTimersByTime(300)
    await flushPromises()

    expect(vm.loading).toBe(true)

    resolveSearch({ items: [] })
    await flushPromises()

    expect(vm.loading).toBe(false)
  })

  it('renders el-option for each fetched user', async () => {
    mockedApi.searchUsers.mockResolvedValue({
      items: [
        { id: 'u1', username: 'alice', displayName: 'Alice', role: 'admin' },
      ],
    } as any)

    const wrapper = mountPicker()
    const vm = wrapper.vm as any
    vm.onSearch('a')
    await vi.advanceTimersByTime(300)
    await flushPromises()

    await wrapper.vm.$forceUpdate()
    await nextTick()

    const options = wrapper.findAll('.el-option-stub')
    expect(options.length).toBe(1)
    expect(options[0].text()).toContain('Alice')
  })
})
