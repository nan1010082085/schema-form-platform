import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import AppLayout from '@/layouts/AppLayout.vue'

// Mock useMenu to avoid real API calls
vi.mock('@/composables/useMenu', () => {
  const vue = require('vue')
  return {
    useMenu: () => ({
      menuTree: vue.ref([]),
      loading: vue.ref(false),
      error: vue.ref(null),
      loaded: vue.ref(false),
      fetchMenus: vi.fn(),
      reset: vi.fn(),
      hasChildren: vi.fn(() => false),
    }),
  }
})

/** 创建测试用路由器 */
function createTestRouter(_initialPath = '/') {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: AppLayout,
        children: [
          { path: '', name: 'portal', component: { template: '<div>Portal</div>' } },
          { path: 'users', name: 'users', component: { template: '<div>Users</div>' } },
        ],
      },
    ],
  })
}

/** 挂载 AppLayout 的辅助函数 */
async function mountLayout(initialPath = '/'): Promise<VueWrapper> {
  const router = createTestRouter(initialPath)
  await router.push(initialPath)
  await router.isReady()

  return mount(AppLayout, {
    global: {
      plugins: [router, ElementPlus, createPinia()],
    },
  })
}

describe('AppLayout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the logo icon', async () => {
    const wrapper = await mountLayout()

    expect(wrapper.text()).toContain('P')
  })

  it('renders sidebar with menu nav', async () => {
    const wrapper = await mountLayout()

    // Sidebar aside element exists
    const sidebar = wrapper.find('aside')
    expect(sidebar.exists()).toBe(true)
  })

  it('renders the version badge', async () => {
    const wrapper = await mountLayout()

    expect(wrapper.text()).toContain('v1.0.0')
  })

  it('renders the home menu item', async () => {
    const wrapper = await mountLayout()

    expect(wrapper.text()).toContain('首页')
  })

  it('renders router-view for child routes', async () => {
    const wrapper = await mountLayout()

    const main = wrapper.find('main')
    expect(main.exists()).toBe(true)
  })

  it('sidebar is not collapsed by default', async () => {
    const wrapper = await mountLayout()

    const sidebar = wrapper.find('aside')
    expect(sidebar.classes().some((c) => c.includes('sidebarCollapsed'))).toBe(false)
  })

  it('toggles sidebar collapse when footer is clicked', async () => {
    const wrapper = await mountLayout()

    const footer = wrapper.find('[class*="sidebarFooter"]')
    expect(footer.exists()).toBe(true)

    // Click to collapse
    await footer.trigger('click')

    const sidebar = wrapper.find('aside')
    expect(sidebar.classes().some((c) => c.includes('sidebarCollapsed'))).toBe(true)

    // Click to expand
    await footer.trigger('click')
    expect(sidebar.classes().some((c) => c.includes('sidebarCollapsed'))).toBe(false)
  })

  it('renders collapse text when expanded', async () => {
    const wrapper = await mountLayout()

    expect(wrapper.text()).toContain('收起菜单')
  })

  it('renders the mobile menu button', async () => {
    const wrapper = await mountLayout()

    const mobileBtn = wrapper.find('[class*="mobileMenuBtn"]')
    expect(mobileBtn.exists()).toBe(true)
  })

  it('renders the user avatar area', async () => {
    const wrapper = await mountLayout()

    const userArea = wrapper.find('[class*="userArea"]')
    expect(userArea.exists()).toBe(true)
  })
})
