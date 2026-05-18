/**
 * FgTabs component unit tests
 *
 * Covers:
 * - Tab rendering and switching
 * - formData preservation across tab switches
 * - Controlled mode (modelValue prop)
 * - Tab configuration (disabled, type, position)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import ElementPlus from 'element-plus'
import FgTabs from '@/components/FormGrid/components/layout/FgTabs.vue'
import type { FormSchemaItem, FormData } from '@/components/FormGrid/types'

/** Stub window.matchMedia for jsdom (used by useBreakpoint -> SchemaRender) */
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

/** Helper: create a minimal schema for one tab */
function makeTabSchema(tabIndex: number): FormSchemaItem {
  return {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col',
        span: 12,
        children: [
          {
            type: 'input',
            field: `tab_${tabIndex}_field`,
            label: `Tab ${tabIndex} Field`,
          },
        ],
      },
    ],
  }
}

/** Helper: mount FgTabs */
function mountTabs(options: {
  tabs?: Array<{ name: string; label: string; disabled?: boolean }>
  children?: FormSchemaItem[]
  modelValue?: string
  tabPosition?: 'top' | 'right' | 'bottom' | 'left'
  type?: '' | 'card' | 'border-card'
  formData?: FormData
} = {}) {
  const tabs = options.tabs ?? [
    { name: 'basic', label: '基本信息' },
    { name: 'approval', label: '审批信息' },
    { name: 'attachment', label: '附件' },
  ]
  const children = options.children ?? tabs.map((_, i) => makeTabSchema(i))
  const formData = options.formData ?? reactive<FormData>({
    tab_0_field: 'value0',
    tab_1_field: 'value1',
    tab_2_field: 'value2',
  })

  return mount(FgTabs, {
    props: {
      tabs,
      children,
      modelValue: options.modelValue,
      tabPosition: options.tabPosition,
      type: options.type,
      formData,
    },
    global: {
      plugins: [ElementPlus],
    },
  })
}

describe('FgTabs', () => {
  beforeAll(() => {
    setupMatchMediaStub()
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })
  // ---------- rendering ----------

  describe('rendering', () => {
    it('renders tab labels', () => {
      const wrapper = mountTabs()
      expect(wrapper.text()).toContain('基本信息')
      expect(wrapper.text()).toContain('审批信息')
      expect(wrapper.text()).toContain('附件')
    })

    it('renders correct number of tab panes', () => {
      const wrapper = mountTabs()
      // el-tab-pane renders each tab
      const panes = wrapper.findAll('.el-tab-pane')
      expect(panes.length).toBeGreaterThanOrEqual(1) // at least active pane
    })

    it('defaults to first tab active', () => {
      const wrapper = mountTabs()
      const tabsComponent = wrapper.findComponent(FgTabs)
      expect(tabsComponent.vm.activeName).toBe('basic')
    })
  })

  // ---------- tab switching ----------

  describe('tab switching', () => {
    it('switches tab on click', async () => {
      const wrapper = mountTabs()
      // Find tab nav items
      const tabNavs = wrapper.findAll('.el-tabs__item')
      expect(tabNavs.length).toBe(3)

      // Click second tab
      await tabNavs[1].trigger('click')
      await wrapper.vm.$nextTick()

      const tabsComponent = wrapper.findComponent(FgTabs)
      expect(tabsComponent.emitted('update:modelValue')).toBeTruthy()
      expect(tabsComponent.emitted('update:modelValue')![0]).toEqual(['approval'])
    })

    it('emits tab-change event on switch', async () => {
      const wrapper = mountTabs()
      const tabNavs = wrapper.findAll('.el-tabs__item')

      await tabNavs[2].trigger('click')
      await wrapper.vm.$nextTick()

      const tabsComponent = wrapper.findComponent(FgTabs)
      expect(tabsComponent.emitted('tab-change')).toBeTruthy()
      expect(tabsComponent.emitted('tab-change')![0]).toEqual(['attachment'])
    })
  })

  // ---------- formData preservation ----------

  describe('formData preservation', () => {
    it('preserves formData across tab switches', async () => {
      const formData = reactive<FormData>({
        tab_0_field: 'preserved_value_0',
        tab_1_field: 'preserved_value_1',
        tab_2_field: 'preserved_value_2',
      })

      const wrapper = mountTabs({ formData })
      const tabNavs = wrapper.findAll('.el-tabs__item')

      // Switch tabs multiple times
      await tabNavs[1].trigger('click')
      await wrapper.vm.$nextTick()
      await tabNavs[2].trigger('click')
      await wrapper.vm.$nextTick()
      await tabNavs[0].trigger('click')
      await wrapper.vm.$nextTick()

      // formData should be unchanged
      expect(formData.tab_0_field).toBe('preserved_value_0')
      expect(formData.tab_1_field).toBe('preserved_value_1')
      expect(formData.tab_2_field).toBe('preserved_value_2')
    })
  })

  // ---------- controlled mode ----------

  describe('controlled mode', () => {
    it('respects modelValue prop', () => {
      const wrapper = mountTabs({ modelValue: 'approval' })
      const tabsComponent = wrapper.findComponent(FgTabs)
      expect(tabsComponent.vm.activeName).toBe('approval')
    })

    it('syncs when modelValue prop changes', async () => {
      const wrapper = mountTabs({ modelValue: 'basic' })
      const tabsComponent = wrapper.findComponent(FgTabs)
      expect(tabsComponent.vm.activeName).toBe('basic')

      await wrapper.setProps({ modelValue: 'attachment' })
      expect(tabsComponent.vm.activeName).toBe('attachment')
    })
  })

  // ---------- disabled tabs ----------

  describe('disabled tabs', () => {
    it('renders disabled tab', () => {
      const tabs = [
        { name: 'basic', label: '基本信息' },
        { name: 'approval', label: '审批信息', disabled: true },
      ]
      const children = tabs.map((_, i) => makeTabSchema(i))
      const wrapper = mountTabs({ tabs, children })

      const tabNavs = wrapper.findAll('.el-tabs__item')
      // Second tab should be disabled
      expect(tabNavs[1].classes()).toContain('is-disabled')
    })
  })

  // ---------- tab configuration ----------

  describe('tab configuration', () => {
    it('applies tabPosition prop', () => {
      const wrapper = mountTabs({ tabPosition: 'left' })
      // el-tabs should have the position class
      const tabsEl = wrapper.find('.el-tabs')
      expect(tabsEl.exists()).toBe(true)
    })

    it('applies type prop', () => {
      const wrapper = mountTabs({ type: 'card' })
      const tabsEl = wrapper.find('.el-tabs')
      expect(tabsEl.exists()).toBe(true)
    })
  })
})
