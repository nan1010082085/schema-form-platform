import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FlowMonitor from '../views/FlowMonitor.vue'

// Mock FlowMonitorDashboard
vi.mock('../components/FlowMonitorDashboard.vue', () => ({
  default: {
    name: 'FlowMonitorDashboard',
    template: '<div class="mock-dashboard">FlowMonitorDashboard Stub</div>',
  },
}))

describe('FlowMonitor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders FlowMonitorDashboard', () => {
    const wrapper = mount(FlowMonitor)
    expect(wrapper.find('.mock-dashboard').exists()).toBe(true)
    expect(wrapper.text()).toContain('FlowMonitorDashboard Stub')
  })
})
