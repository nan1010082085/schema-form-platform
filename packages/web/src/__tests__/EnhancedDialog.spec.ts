import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ElementPlus from 'element-plus'
import EnhancedDialog from '@/components/EnhancedDialog.vue'

describe('EnhancedDialog', () => {
  it('renders el-dialog', async () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test' },
      global: { plugins: [ElementPlus] },
    })
    await nextTick()
    expect(wrapper.find('.el-dialog').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows fullscreen button by default', async () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test' },
      global: { plugins: [ElementPlus] },
    })
    await nextTick()
    expect(wrapper.find('[data-testid="fullscreen-btn"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('hides fullscreen button when showFullscreenBtn is false', async () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test', showFullscreenBtn: false },
      global: { plugins: [ElementPlus] },
    })
    await nextTick()
    expect(wrapper.find('[data-testid="fullscreen-btn"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('toggles fullscreen on button click', async () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test' },
      global: { plugins: [ElementPlus] },
    })
    await nextTick()
    await wrapper.find('[data-testid="fullscreen-btn"]').trigger('click')
    await nextTick()
    expect(wrapper.find('.el-dialog').classes()).toContain('is-fullscreen')
    wrapper.unmount()
  })
})
