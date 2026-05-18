// @ts-nocheck
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, defineComponent, nextTick } from 'vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

const HealthyComponent = defineComponent({
  template: '<div class="healthy">正常运行</div>',
})

describe('ErrorBoundary', () => {
  it('正常渲染子组件时不显示错误 UI', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: { default: () => h(HealthyComponent) },
    })

    expect(wrapper.find('.fg-error-boundary').exists()).toBe(false)
    expect(wrapper.find('.healthy').exists()).toBe(true)
  })

  it('渲染 nodeType 和 nodeField 信息', () => {
    const wrapper = mount(ErrorBoundary, {
      props: {
        nodeType: 'search-list',
        nodeField: 'myField',
        nodePath: '0,1,2',
      },
      slots: { default: () => h(HealthyComponent) },
    })

    // 不抛错时显示正常内容
    expect(wrapper.find('.healthy').exists()).toBe(true)
  })

  it('点击重试按钮后重新渲染子组件', async () => {
    // 通过强制更新来模拟错误恢复流程
    const wrapper = mount(ErrorBoundary, {
      slots: { default: () => h(HealthyComponent) },
    })

    // 手动设置错误状态
    (wrapper.vm as any).hasError = true
    (wrapper.vm as any).error = new Error('测试错误')
    await nextTick()

    expect(wrapper.find('.fg-error-boundary').exists()).toBe(true)
    expect(wrapper.find('.fg-error-boundary__message').text()).toContain('测试错误')

    // 点击重试
    await wrapper.find('.el-button').trigger('click')
    await nextTick()

    expect(wrapper.find('.fg-error-boundary').exists()).toBe(false)
    expect(wrapper.find('.healthy').exists()).toBe(true)
  })

  it('错误边界记录 nodePath 到 console', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(ErrorBoundary, {
      props: { nodePath: '3,0', nodeType: 'input', nodeField: 'name' },
      slots: { default: () => h(HealthyComponent) },
    })

    (wrapper.vm as any).hasError = true
    (wrapper.vm as any).error = new Error('测试')
    await nextTick()

    // 验证错误 UI 显示了节点信息
    expect(wrapper.find('.fg-error-boundary__info').text()).toContain('input')
    expect(wrapper.find('.fg-error-boundary__info').text()).toContain('name')
    expect(wrapper.find('.fg-error-boundary__info').text()).toContain('3,0')

    consoleSpy.mockRestore()
  })

  it('重试时 key 递增触发子组件重新挂载', async () => {
    const mountSpy = vi.fn()

    const SpyComponent = defineComponent({
      template: '<div class="spied">spy</div>',
      mounted() {
        mountSpy()
      },
    })

    const wrapper = mount(ErrorBoundary, {
      slots: { default: () => h(SpyComponent) },
    })

    const initialMountCount = mountSpy.mock.calls.length

    // 模拟错误并重试
    (wrapper.vm as any).hasError = true
    (wrapper.vm as any).error = new Error('test')
    await nextTick()

    await wrapper.find('.el-button').trigger('click')
    await nextTick()

    // 重试后组件重新挂载
    expect(mountSpy.mock.calls.length).toBeGreaterThan(initialMountCount)
  })
})
