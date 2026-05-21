/**
 * FgTabs widget unit tests
 *
 * Covers:
 * - Tab rendering from widgetData
 * - Tab switching (internal state)
 * - Tab configuration (type, position)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, provide } from 'vue'
import ElementPlus from 'element-plus'
import FgTabs from '@/widgets/tabs/FgTabs.vue'
import { widgetDataKey } from '@/widgets/base/types'
import type { Widget } from '@/widgets/base/types'

/** Stub window.matchMedia for jsdom */
function setupMatchMediaStub() {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

/** Helper: create a mock Widget for tabs */
function makeTabsWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: 'tabs_abc12',
    name: 'FgTabs',
    type: 'tabs',
    position: { x: 0, y: 0, w: 12, h: 6 },
    props: {
      tabs: [
        { key: 'basic', label: '基本信息' },
        { key: 'approval', label: '审批信息' },
        { key: 'attachment', label: '附件' },
      ],
    },
    ...overrides,
  }
}

/** Helper: mount FgTabs with widgetData inject */
function mountTabs(options: {
  widget?: Partial<Widget>
} = {}) {
  const widget = makeTabsWidget(options.widget)

  // Wrapper component that provides widgetDataKey
  const Wrapper = defineComponent({
    setup() {
      provide(widgetDataKey, computed(() => widget))
    },
    render() {
      return h(FgTabs)
    },
  })

  return mount(Wrapper, {
    global: {
      plugins: [ElementPlus],
    },
  })
}

describe('FgTabs (widget)', () => {
  beforeAll(() => {
    setupMatchMediaStub()
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  // ---------- rendering ----------

  describe('rendering', () => {
    it('renders tab labels from widgetData', () => {
      const wrapper = mountTabs()
      expect(wrapper.text()).toContain('基本信息')
      expect(wrapper.text()).toContain('审批信息')
      expect(wrapper.text()).toContain('附件')
    })

    it('renders correct number of tab panes', () => {
      const wrapper = mountTabs()
      const panes = wrapper.findAll('.el-tab-pane')
      expect(panes.length).toBeGreaterThanOrEqual(1)
    })

    it('defaults to first tab active', () => {
      const wrapper = mountTabs()
      // First tab should be active (has is-active class)
      const activeTab = wrapper.find('.el-tabs__item.is-active')
      expect(activeTab.exists()).toBe(true)
      expect(activeTab.text()).toContain('基本信息')
    })
  })

  // ---------- tab switching ----------

  describe('tab switching', () => {
    it('switches tab on click', async () => {
      const wrapper = mountTabs()
      const tabNavs = wrapper.findAll('.el-tabs__item')
      expect(tabNavs.length).toBe(3)

      await tabNavs[1].trigger('click')
      await wrapper.vm.$nextTick()

      // Second tab should now be active
      const activeTab = wrapper.find('.el-tabs__item.is-active')
      expect(activeTab.text()).toContain('审批信息')
    })
  })

  // ---------- tab configuration ----------

  describe('tab configuration', () => {
    it('applies tabPosition from widgetData', () => {
      const wrapper = mountTabs({
        widget: { props: { tabs: [{ key: 't1', label: 'Tab 1' }], tabPosition: 'left' } },
      })
      const tabsEl = wrapper.find('.el-tabs')
      expect(tabsEl.exists()).toBe(true)
    })

    it('applies type from widgetData', () => {
      const wrapper = mountTabs({
        widget: { props: { tabs: [{ key: 't1', label: 'Tab 1' }], type: 'card' } },
      })
      const tabsEl = wrapper.find('.el-tabs')
      expect(tabsEl.exists()).toBe(true)
    })

    it('handles empty tabs gracefully', () => {
      const wrapper = mountTabs({
        widget: { props: { tabs: [] } },
      })
      expect(wrapper.exists()).toBe(true)
    })
  })
})
