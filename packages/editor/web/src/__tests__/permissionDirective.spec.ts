import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { permissionDirective } from '@/directives/permission'
import { useAppStore } from '@/stores/app'

/**
 * 创建测试组件：渲染一个带 v-permission 的 div
 */
function createTestComponent(value: string | string[]) {
  return defineComponent({
    directives: { permission: permissionDirective },
    setup() {
      return () =>
        h('div', [
          h(
            'span',
            {
              'data-test': 'target',
              'v-permission': value,
            },
            'content'
          ),
        ])
    },
  })
}

/**
 * mount with directive — 因为 h() 不支持指令，改用 template 字符串
 */
function mountWithPermission(value: string | string[]) {
  const valueStr = typeof value === 'string' ? `'${value}'` : `['${value.join("','")}']`
  return mount(
    defineComponent({
      directives: { permission: permissionDirective },
      template: `<div><span data-test="target" v-permission="${valueStr}">content</span></div>`,
    }),
    { global: { directives: { permission: permissionDirective } } }
  )
}

describe('v-permission directive', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps element when user has the required permission (string)', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = ['flow:design']

    const wrapper = mountWithPermission('flow:design')
    expect(wrapper.find('[data-test="target"]').exists()).toBe(true)
  })

  it('removes element when user lacks the required permission (string)', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = ['other:perm']

    const wrapper = mountWithPermission('flow:design')
    expect(wrapper.find('[data-test="target"]').exists()).toBe(false)
  })

  it('keeps element when user has at least one permission (array OR logic)', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = ['flow:approve']

    const wrapper = mountWithPermission(['flow:design', 'flow:approve'])
    expect(wrapper.find('[data-test="target"]').exists()).toBe(true)
  })

  it('removes element when user has none of the array permissions', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = ['other:perm']

    const wrapper = mountWithPermission(['flow:design', 'flow:approve'])
    expect(wrapper.find('[data-test="target"]').exists()).toBe(false)
  })

  it('removes element when permissions array is empty on user', () => {
    const appStore = useAppStore()
    appStore.userContext.permissions = []

    const wrapper = mountWithPermission('flow:design')
    expect(wrapper.find('[data-test="target"]').exists()).toBe(false)
  })

  it('removes element when user has no permissions field (default)', () => {
    const wrapper = mountWithPermission('flow:design')
    expect(wrapper.find('[data-test="target"]').exists()).toBe(false)
  })
})
