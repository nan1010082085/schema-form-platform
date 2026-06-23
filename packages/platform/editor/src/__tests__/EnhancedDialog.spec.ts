import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ElementPlus from 'element-plus'
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
    expect(document.querySelector('.t-dialog')).toBeTruthy()
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
    // 点击后应显示退出全屏图标（FullscreenExitIcon），原全屏按钮消失
    const exitBtn = document.querySelector('[data-testid="fullscreen-btn"]') as HTMLElement
    expect(exitBtn).toBeTruthy()
    // 全屏状态下的样式类应用到 dialog context wrapper
    const dialogCtx = document.querySelector('.t-dialog__ctx')
    expect(dialogCtx?.classList.contains('is-fullscreen')).toBe(true)
    wrapper.unmount()
  })
})
