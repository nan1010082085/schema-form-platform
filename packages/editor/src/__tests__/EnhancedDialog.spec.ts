import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TDesign from 'tdesign-vue-next'
import EnhancedDialog from '@/components/EnhancedDialog.vue'

// el-dialog uses append-to-body (Teleport), so query from document instead of wrapper

describe('EnhancedDialog', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders el-dialog', async () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test' },
      global: { plugins: [ElementPlus] },
    })
    await nextTick()
    expect(document.querySelector('.el-dialog')).toBeTruthy()
    wrapper.unmount()
  })

  it('shows fullscreen button by default', async () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test' },
      global: { plugins: [ElementPlus] },
    })
    await nextTick()
    expect(document.querySelector('[data-testid="fullscreen-btn"]')).toBeTruthy()
    wrapper.unmount()
  })

  it('hides fullscreen button when showFullscreenBtn is false', async () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test', showFullscreenBtn: false },
      global: { plugins: [ElementPlus] },
    })
    await nextTick()
    expect(document.querySelector('[data-testid="fullscreen-btn"]')).toBeNull()
    wrapper.unmount()
  })

  it('toggles fullscreen on button click', async () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test' },
      global: { plugins: [ElementPlus] },
    })
    await nextTick()
    const btn = document.querySelector('[data-testid="fullscreen-btn"]') as HTMLElement
    expect(btn).toBeTruthy()
    btn.click()
    await nextTick()
    const dialog = document.querySelector('.el-dialog') as HTMLElement
    expect(dialog.classList.contains('is-fullscreen')).toBe(true)
    wrapper.unmount()
  })
})
