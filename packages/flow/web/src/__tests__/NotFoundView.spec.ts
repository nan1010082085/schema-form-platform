import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NotFoundView from '../views/NotFoundView.vue'

describe('NotFoundView', () => {
  const wrapper = mount(NotFoundView)

  it('renders 404 text', () => {
    expect(wrapper.text()).toContain('404')
  })

  it('renders "页面不存在" message', () => {
    expect(wrapper.text()).toContain('页面不存在')
  })

  it('contains link to /flow/list', () => {
    const link = wrapper.find('a[href="/flow/list"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('返回流程列表')
  })
})
